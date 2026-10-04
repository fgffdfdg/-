import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import {
  verifyPassword,
  setAdminSession,
  getAdminSession,
  clearAdminSession,
  hashPassword,
} from '@/lib/admin/auth';
import type { AdminUser } from '@/lib/admin/auth';

// POST /api/admin/auth - Login or create initial admin
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body as { action?: string };

    // Action: init - Create first admin account (only when no admins exist)
    if (action === 'init') {
      return await handleInit(body);
    }

    // Action: login (default)
    return await handleLogin(body);
  } catch {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}

// GET /api/admin/auth - Verify current session
export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ authenticated: false });
    }
    return NextResponse.json({
      authenticated: true,
      admin: {
        id: session.id,
        email: session.email,
        name: session.name,
        role: session.role,
      },
    });
  } catch {
    return NextResponse.json(
      { authenticated: false },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/auth - Logout
export async function DELETE() {
  try {
    await clearAdminSession();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/auth - Change password
export async function PUT(request: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { oldPassword, newPassword } = body as { oldPassword: string; newPassword: string };

    if (!oldPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'New password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();

    // Verify old password
    const { data: admin, error: fetchError } = await client
      .from('admin_users')
      .select('id, password_hash')
      .eq('id', session.id)
      .maybeSingle();

    if (fetchError) throw new Error(`Query failed: ${fetchError.message}`);
    if (!admin) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      );
    }

    const valid = await verifyPassword(oldPassword, admin.password_hash);
    if (!valid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      );
    }

    // Update password
    const newHash = await hashPassword(newPassword);
    const { error: updateError } = await client
      .from('admin_users')
      .update({ password_hash: newHash, updated_at: new Date().toISOString() })
      .eq('id', session.id);

    if (updateError) throw new Error(`Update failed: ${updateError.message}`);

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// --- Internal handlers ---

async function handleLogin(body: Record<string, unknown>) {
  try {
    const { email, password } = body as { email: string; password: string };

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Please enter email and password' },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();

    const { data: admin, error } = await client
      .from('admin_users')
      .select('id, email, password_hash, name, role, is_active')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (error) throw new Error(`Query failed: ${error.message}`);
    if (!admin) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    if (!admin.is_active) {
      return NextResponse.json(
        { error: 'Account has been disabled' },
        { status: 403 }
      );
    }

    const valid = await verifyPassword(password, admin.password_hash);
    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Update last login time
    await client
      .from('admin_users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', admin.id);

    // Set session cookie
    await setAdminSession(admin as AdminUser);

    return NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Login failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function handleInit(body: Record<string, unknown>) {
  try {
    const client = getSupabaseClient();

    // Check if any admin exists
    const { count } = await client
      .from('admin_users')
      .select('*', { count: 'exact', head: true });

    if (count && count > 0) {
      return NextResponse.json(
        { error: 'Admin account already exists' },
        { status: 409 }
      );
    }

    const { email, password, name } = body as {
      email: string;
      password: string;
      name: string;
    };

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Please fill in all fields' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);

    const { data: newAdmin, error } = await client
      .from('admin_users')
      .insert({
        email: email.toLowerCase().trim(),
        password_hash: passwordHash,
        name,
        role: 'super_admin',
        is_active: true,
      })
      .select('id, email, name, role')
      .single();

    if (error) throw new Error(`Create failed: ${error.message}`);

    return NextResponse.json({
      success: true,
      admin: newAdmin,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Init failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
