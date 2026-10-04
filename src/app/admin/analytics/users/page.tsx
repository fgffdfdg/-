import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, UserPlus, UserCheck, UserX } from 'lucide-react';

const stats = [
  { label: '总用户数', value: '1,234', icon: Users, color: 'text-blue-600' },
  { label: '今日新增', value: '28', icon: UserPlus, color: 'text-green-600' },
  { label: '活跃用户', value: '892', icon: UserCheck, color: 'text-purple-600' },
  { label: '禁用用户', value: '12', icon: UserX, color: 'text-red-600' },
];

const users = [
  { id: 1, email: 'user1@example.com', company: 'ABC 贸易', status: 'active', joinedAt: '2024-01-15' },
  { id: 2, email: 'user2@example.com', company: 'XYZ 出口', status: 'active', joinedAt: '2024-01-14' },
  { id: 3, email: 'user3@example.com', company: 'DEF 国际', status: 'inactive', joinedAt: '2024-01-13' },
  { id: 4, email: 'user4@example.com', company: 'GHI 汽车', status: 'active', joinedAt: '2024-01-12' },
  { id: 5, email: 'user5@example.com', company: 'JKL 贸易', status: 'banned', joinedAt: '2024-01-11' },
];

export default function UsersAnalyticsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">用户统计</h1>
        <p className="text-gray-600 mt-1">查看用户数据和分析</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">{stat.label}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>用户列表</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>邮箱</TableHead>
                <TableHead>公司</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>注册时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>{user.company}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      user.status === 'active' ? 'bg-green-100 text-green-800' :
                      user.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {user.status === 'active' ? '活跃' : user.status === 'inactive' ? '未活跃' : '已禁用'}
                    </span>
                  </TableCell>
                  <TableCell>{user.joinedAt}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
