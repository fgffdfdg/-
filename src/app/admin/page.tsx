import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, TrendingUp, Activity } from 'lucide-react';

const stats = [
  {
    title: '总用户数',
    value: '1,234',
    change: '+12%',
    icon: Users,
    color: 'text-blue-600',
  },
  {
    title: '活跃用户',
    value: '892',
    change: '+8%',
    icon: Activity,
    color: 'text-green-600',
  },
  {
    title: '内容数量',
    value: '156',
    change: '+23%',
    icon: FileText,
    color: 'text-purple-600',
  },
  {
    title: '本月增长',
    value: '+18%',
    change: '+5%',
    icon: TrendingUp,
    color: 'text-orange-600',
  },
];

export default function AdminDashboard() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">数据概览</h1>
        <p className="text-gray-600 mt-1">欢迎回来，管理员</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-green-600 mt-1">{stat.change} 较上月</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>最近活动</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { action: '新用户注册', user: 'user@example.com', time: '5分钟前' },
                { action: '内容更新', user: '管理员', time: '1小时前' },
                { action: '活动创建', user: '管理员', time: '3小时前' },
                { action: '数据导出', user: '管理员', time: '昨天' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{item.action}</p>
                    <p className="text-xs text-gray-500">{item.user}</p>
                  </div>
                  <span className="text-xs text-gray-400">{item.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>快速操作</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: '创建内容', href: '/admin/content/articles/new' },
                { label: '发布活动', href: '/admin/campaigns/new' },
                { label: '查看报表', href: '/admin/analytics/reports' },
                { label: '用户管理', href: '/admin/users' },
              ].map((action) => (
                <a
                  key={action.label}
                  href={action.href}
                  className="px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm font-medium text-center transition-colors"
                >
                  {action.label}
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
