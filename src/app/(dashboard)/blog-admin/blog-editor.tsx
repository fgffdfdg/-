'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClientWithRetry } from '@/lib/supabase-browser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Save,
  Send,
  Loader2,
  Eye,
  FileText,
  X,
  Plus,
  Settings2,
} from 'lucide-react';

interface BlogPostData {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image: string | null;
  author_name: string;
  status: 'draft' | 'published';
  tags: string[];
  meta_title: string | null;
  meta_description: string | null;
}

interface BlogEditorProps {
  postId?: string;
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 200) || `post-${Date.now()}`;
}

export default function BlogEditor({ postId }: BlogEditorProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(!!postId);
  const [saving, setSaving] = useState(false);
  const [showSeo, setShowSeo] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManual, setSlugManual] = useState(false);
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [authorName, setAuthorName] = useState('汽车出口通');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [tags, setTags] = useState<string[]>([]);
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');

  useEffect(() => {
    if (!postId) return;
    (async () => {
      try {
        const supabase = await getSupabaseBrowserClientWithRetry();
        const { data, error } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('id', postId)
          .single();
        if (error) throw error;
        if (data) {
          const post = data as BlogPostData;
          setTitle(post.title);
          setSlug(post.slug);
          setSlugManual(true);
          setExcerpt(post.excerpt || '');
          setContent(post.content);
          setCoverImage(post.cover_image || '');
          setAuthorName(post.author_name);
          setStatus(post.status);
          setTags(post.tags || []);
          setMetaTitle(post.meta_title || '');
          setMetaDescription(post.meta_description || '');
        }
      } catch (err) {
        console.error('Failed to load post:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [postId]);

  // Auto-generate slug from title
  useEffect(() => {
    if (!slugManual && title) {
      setSlug(generateSlug(title));
    }
  }, [title, slugManual]);

  const handleAddTag = useCallback(() => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) {
      setTags(prev => [...prev, tag]);
      setTagInput('');
    }
  }, [tagInput, tags]);

  const handleRemoveTag = useCallback((tag: string) => {
    setTags(prev => prev.filter(t => t !== tag));
  }, []);

  const handleSave = async (publishStatus: 'draft' | 'published') => {
    if (!title.trim() || !content.trim()) {
      alert('标题和内容不能为空');
      return;
    }

    setSaving(true);
    try {
      const supabase = await getSupabaseBrowserClientWithRetry();
      const postData = {
        title: title.trim(),
        slug: slug || generateSlug(title),
        excerpt: excerpt.trim(),
        content,
        cover_image: coverImage.trim() || null,
        author_name: authorName.trim() || '汽车出口通',
        status: publishStatus,
        tags,
        meta_title: metaTitle.trim() || title.trim(),
        meta_description: metaDescription.trim() || excerpt.trim(),
        updated_at: new Date().toISOString(),
      };

      if (postId) {
        // Update existing post
        const updateData: Record<string, unknown> = { ...postData };
        // Set published_at when transitioning from draft to published
        if (publishStatus === 'published' && status === 'draft') {
          updateData.published_at = new Date().toISOString();
        }
        const { error } = await supabase
          .from('blog_posts')
          .update(updateData)
          .eq('id', postId);
        if (error) throw error;
      } else {
        // Create new post
        const insertData: Record<string, unknown> = { ...postData };
        if (publishStatus === 'published') {
          insertData.published_at = new Date().toISOString();
        }
        const { error } = await supabase
          .from('blog_posts')
          .insert(insertData);
        if (error) throw error;
      }

      router.push('/blog-admin');
    } catch (err) {
      console.error('Save failed:', err);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-navy" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/blog-admin')}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            返回
          </Button>
          <h1 className="text-xl font-bold text-navy">
            {postId ? '编辑文章' : '新建文章'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => handleSave('draft')}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            存为草稿
          </Button>
          <Button
            className="bg-orange hover:bg-orange-light"
            onClick={() => handleSave('published')}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            发布
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">文章内容</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">文章标题 *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="输入文章标题..."
                  className="mt-1.5 text-base"
                />
              </div>

              <div>
                <Label htmlFor="slug">URL Slug</Label>
                <div className="flex items-center mt-1.5">
                  <span className="text-sm text-muted-foreground mr-2">/blog/</span>
                  <Input
                    id="slug"
                    value={slug}
                    onChange={(e) => { setSlug(e.target.value); setSlugManual(true); }}
                    placeholder="article-url-slug"
                    className="font-mono text-sm"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  用于 SEO 友好的 URL，留空则自动从标题生成
                </p>
              </div>

              <div>
                <Label htmlFor="excerpt">文章摘要</Label>
                <Textarea
                  id="excerpt"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="简短描述文章内容，用于列表展示和 SEO..."
                  rows={3}
                  className="mt-1.5"
                />
              </div>

              <Separator />

              <div>
                <Label htmlFor="content">正文内容 * (支持 HTML)</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="输入文章正文内容，支持 HTML 标签...&#10;&#10;示例:&#10;<h2>标题</h2>&#10;<p>段落内容</p>&#10;<ul><li>列表项</li></ul>"
                  rows={20}
                  className="mt-1.5 font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  支持 HTML 标签：h2-h4, p, ul, ol, li, strong, em, a, img, blockquote, code, pre, table 等
                </p>
              </div>
            </CardContent>
          </Card>

          {/* SEO Settings */}
          <Card>
            <CardHeader className="cursor-pointer" onClick={() => setShowSeo(!showSeo)}>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  SEO 设置
                </CardTitle>
                <span className="text-xs text-muted-foreground">
                  {showSeo ? '收起' : '展开'}
                </span>
              </div>
            </CardHeader>
            {showSeo && (
              <CardContent className="space-y-4 pt-0">
                <div>
                  <Label htmlFor="metaTitle">SEO 标题</Label>
                  <Input
                    id="metaTitle"
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                    placeholder={title || '留空则使用文章标题'}
                    className="mt-1.5"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    搜索引擎显示的标题，建议 50-60 字符
                  </p>
                </div>
                <div>
                  <Label htmlFor="metaDescription">SEO 描述</Label>
                  <Textarea
                    id="metaDescription"
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    placeholder={excerpt || '留空则使用文章摘要'}
                    rows={3}
                    className="mt-1.5"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    搜索引擎显示的摘要，建议 120-160 字符
                  </p>
                </div>
                {/* SEO Preview */}
                <div className="rounded-lg border border-border p-4 bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-2">搜索引擎预览</p>
                  <p className="text-sm text-blue-700 truncate">
                    {metaTitle || title || '文章标题'} - 汽车出口通
                  </p>
                  <p className="text-xs text-green-700 truncate">
                    {`https://your-domain.com/blog/${slug || 'article-slug'}`}
                  </p>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {metaDescription || excerpt || '文章摘要内容将显示在这里...'}
                  </p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">发布设置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>状态</Label>
                <div className="flex gap-2 mt-1.5">
                  <Badge
                    className={`cursor-pointer ${status === 'draft' ? 'bg-orange text-white' : 'bg-muted text-muted-foreground'}`}
                    onClick={() => setStatus('draft')}
                  >
                    草稿
                  </Badge>
                  <Badge
                    className={`cursor-pointer ${status === 'published' ? 'bg-success text-white' : 'bg-muted text-muted-foreground'}`}
                    onClick={() => setStatus('published')}
                  >
                    已发布
                  </Badge>
                </div>
              </div>
              <div>
                <Label htmlFor="author">作者</Label>
                <Input
                  id="author"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </CardContent>
          </Card>

          {/* Cover Image */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">封面图片</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="coverImage">图片 URL</Label>
                <Input
                  id="coverImage"
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="mt-1.5"
                />
              </div>
              {coverImage && (
                <div className="rounded-lg overflow-hidden border border-border">
                  <img
                    src={coverImage}
                    alt="封面预览"
                    className="w-full h-32 object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">标签</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="输入标签后回车"
                  className="text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddTag}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="cursor-pointer gap-1"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    {tag}
                    <X className="h-3 w-3" />
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Tips */}
          <Card className="bg-navy/5 border-navy/10">
            <CardContent className="pt-4">
              <h4 className="text-sm font-medium text-navy flex items-center gap-1.5">
                <FileText className="h-4 w-4" />
                SEO 写作建议
              </h4>
              <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                <li>- 标题包含核心关键词</li>
                <li>- 摘要控制在 120-160 字符</li>
                <li>- 正文使用 H2/H3 分层结构</li>
                <li>- 添加相关标签便于分类</li>
                <li>- 封面图提升点击率</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
