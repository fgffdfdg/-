import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Play, Pause } from 'lucide-react';

const campaigns = [
  { id: 1, name: '新年促销活动', status: 'active', participants: 156, startDate: '2024-01-01', endDate: '2024-01-31' },
  { id: 2, name: '春季出口优惠', status: 'draft', participants: 0, startDate: '2024-03-01', endDate: '2024-03-31' },
  { id: 3, name: '夏季特惠', status: 'ended', participants: 89, startDate: '2023-06-01', endDate: '2023-06-30' },
  { id: 4, name: '双十一活动', status: 'ended', participants: 234, startDate: '2023-11-01', endDate: '2023-11-11' },
];

export default function CampaignsListPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">活动管理</h1>
          <p className="text-gray-600 mt-1">创建和管理运营活动</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          新建活动
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>活动名称</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>参与人数</TableHead>
                <TableHead>开始日期</TableHead>
                <TableHead>结束日期</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell className="font-medium">{campaign.name}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      campaign.status === 'active' ? 'bg-green-100 text-green-800' :
                      campaign.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {campaign.status === 'active' ? '进行中' : campaign.status === 'draft' ? '草稿' : '已结束'}
                    </span>
                  </TableCell>
                  <TableCell>{campaign.participants}</TableCell>
                  <TableCell>{campaign.startDate}</TableCell>
                  <TableCell>{campaign.endDate}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm">
                        {campaign.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
