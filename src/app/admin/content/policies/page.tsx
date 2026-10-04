import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2 } from 'lucide-react';

const policies = [
  { id: 1, country: '俄罗斯', region: '独联体', tariff: '15%', updatedAt: '2024-01-15' },
  { id: 2, country: '阿联酋', region: '中东', tariff: '5%', updatedAt: '2024-01-14' },
  { id: 3, country: '尼日利亚', region: '非洲', tariff: '20%', updatedAt: '2024-01-13' },
  { id: 4, country: '泰国', region: '东南亚', tariff: '10%', updatedAt: '2024-01-12' },
  { id: 5, country: '智利', region: '南美', tariff: '8%', updatedAt: '2024-01-11' },
];

export default function PoliciesPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">准入政策管理</h1>
          <p className="text-gray-600 mt-1">管理各国二手车进口政策</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          新建政策
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>国家</TableHead>
                <TableHead>区域</TableHead>
                <TableHead>关税税率</TableHead>
                <TableHead>更新时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies.map((policy) => (
                <TableRow key={policy.id}>
                  <TableCell className="font-medium">{policy.country}</TableCell>
                  <TableCell>{policy.region}</TableCell>
                  <TableCell>{policy.tariff}</TableCell>
                  <TableCell>{policy.updatedAt}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
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
