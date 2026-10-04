import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2 } from 'lucide-react';

const templates = [
  { id: 1, name: '出口许可证申请表', category: '许可证', updatedAt: '2024-01-15' },
  { id: 2, name: '报关单', category: '报关', updatedAt: '2024-01-14' },
  { id: 3, name: '商业发票', category: '发票', updatedAt: '2024-01-13' },
  { id: 4, name: '装箱单', category: '装箱', updatedAt: '2024-01-12' },
  { id: 5, name: '提单', category: '运输', updatedAt: '2024-01-11' },
];

export default function TemplatesPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">单证模板管理</h1>
          <p className="text-gray-600 mt-1">管理出口单证模板</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          新建模板
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>模板名称</TableHead>
                <TableHead>分类</TableHead>
                <TableHead>更新时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell>{template.category}</TableCell>
                  <TableCell>{template.updatedAt}</TableCell>
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
