import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card } from '@/components/ui/card';
import { Eye, MoreHorizontal, Flag, Ban, MessageSquare, User, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface DialogueListTableProps {
  searchTerm?: string;
  statusFilter?: string;
  dateFilter?: string;
  flaggedOnly?: boolean;
}

interface Dialogue {
  id: string;
  user: {
    id: string;
    nickname: string;
    avatar_url?: string;
  };
  book: {
    id: string;
    title: string;
  };
  status: 'active' | 'ended' | 'expired';
  message_count: number;
  created_at: string;
  ended_at?: string;
  last_message_at: string;
  is_flagged?: boolean;
  flag_reason?: string;
  total_tokens: number;
  sentiment_score?: number;
}

export default function DialogueListTable({
  searchTerm = '',
  statusFilter = 'all',
  dateFilter = 'all',
  flaggedOnly = false
}: DialogueListTableProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [dialogues, setDialogues] = useState<Dialogue[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadDialogues();
  }, [searchTerm, statusFilter, dateFilter, flaggedOnly, page]);

  const loadDialogues = async () => {
    try {
      setLoading(true);
      // TODO: 调用API获取对话列表
      // const response = await fetch('/api/v1/admin/dialogues', {
      //   params: { search: searchTerm, status: statusFilter, date: dateFilter, flagged: flaggedOnly, page }
      // });
      // const data = await response.json();
      // setDialogues(data.items);
      // setTotalPages(data.total_pages);

      // 模拟数据
      const mockData: Dialogue[] = [
        {
          id: '1',
          user: { id: '1', nickname: '张三', avatar_url: '' },
          book: { id: '1', title: '认知觉醒' },
          status: 'active',
          message_count: 15,
          created_at: new Date(Date.now() - 3600000).toISOString(),
          last_message_at: new Date(Date.now() - 300000).toISOString(),
          total_tokens: 2500,
          sentiment_score: 0.8
        },
        {
          id: '2',
          user: { id: '2', nickname: '李四', avatar_url: '' },
          book: { id: '2', title: '原则' },
          status: 'ended',
          message_count: 23,
          created_at: new Date(Date.now() - 7200000).toISOString(),
          ended_at: new Date(Date.now() - 1800000).toISOString(),
          last_message_at: new Date(Date.now() - 1800000).toISOString(),
          total_tokens: 4200,
          sentiment_score: 0.6
        },
        {
          id: '3',
          user: { id: '3', nickname: '王五', avatar_url: '' },
          book: { id: '3', title: '思考，快与慢' },
          status: 'active',
          message_count: 8,
          created_at: new Date(Date.now() - 1800000).toISOString(),
          last_message_at: new Date(Date.now() - 60000).toISOString(),
          is_flagged: true,
          flag_reason: '包含敏感内容',
          total_tokens: 1200,
          sentiment_score: -0.3
        }
      ];

      setDialogues(flaggedOnly ? mockData.filter(d => d.is_flagged) : mockData);
      setTotalPages(3);
    } catch (error) {
      console.error('Failed to load dialogues:', error);
      toast({
        title: '加载失败',
        description: '无法加载对话列表',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(dialogues.map(d => d.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedItems);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedItems(newSelected);
  };

  const handleViewDetail = (id: string) => {
    router.push(`/admin/dialogues/${id}`);
  };

  const handleFlagDialogue = async (id: string) => {
    try {
      // TODO: 调用标记API
      toast({
        title: '标记成功',
        description: '对话已标记为需要关注'
      });
      loadDialogues();
    } catch (error) {
      toast({
        title: '标记失败',
        description: '无法标记对话',
        variant: 'destructive'
      });
    }
  };

  const handleEndDialogue = async (id: string) => {
    try {
      // TODO: 调用结束对话API
      toast({
        title: '操作成功',
        description: '对话已结束'
      });
      loadDialogues();
    } catch (error) {
      toast({
        title: '操作失败',
        description: '无法结束对话',
        variant: 'destructive'
      });
    }
  };

  const handleBatchAction = async (action: string) => {
    if (selectedItems.size === 0) {
      toast({
        title: '请选择项目',
        description: '请先选择要操作的对话',
        variant: 'destructive'
      });
      return;
    }

    try {
      // TODO: 调用批量操作API
      toast({
        title: '操作成功',
        description: `已对 ${selectedItems.size} 个对话执行${action}操作`
      });
      setSelectedItems(new Set());
      loadDialogues();
    } catch (error) {
      toast({
        title: '操作失败',
        description: '批量操作失败',
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      active: { variant: 'default', label: '进行中' },
      ended: { variant: 'secondary', label: '已结束' },
      expired: { variant: 'outline', label: '已过期' }
    };
    const config = variants[status] || variants.ended;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getSentimentColor = (score?: number) => {
    if (!score) return 'text-gray-500';
    if (score > 0.5) return 'text-green-500';
    if (score < -0.5) return 'text-red-500';
    return 'text-yellow-500';
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">加载中...</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* 批量操作栏 */}
      {selectedItems.size > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              已选择 {selectedItems.size} 个对话
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBatchAction('flag')}
              >
                批量标记
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBatchAction('end')}
              >
                批量结束
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleBatchAction('delete')}
              >
                批量删除
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* 对话列表表格 */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedItems.size === dialogues.length && dialogues.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>用户</TableHead>
              <TableHead>书籍</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>消息数</TableHead>
              <TableHead>情感倾向</TableHead>
              <TableHead>最后消息</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dialogues.map((dialogue) => (
              <TableRow key={dialogue.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedItems.has(dialogue.id)}
                    onCheckedChange={(checked) => handleSelectItem(dialogue.id, checked as boolean)}
                  />
                </TableCell>
                <TableCell onClick={() => handleViewDetail(dialogue.id)}>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{dialogue.user.nickname}</span>
                    {dialogue.is_flagged && (
                      <Flag className="h-4 w-4 text-orange-500" title={dialogue.flag_reason} />
                    )}
                  </div>
                </TableCell>
                <TableCell onClick={() => handleViewDetail(dialogue.id)}>
                  {dialogue.book.title}
                </TableCell>
                <TableCell onClick={() => handleViewDetail(dialogue.id)}>
                  {getStatusBadge(dialogue.status)}
                </TableCell>
                <TableCell onClick={() => handleViewDetail(dialogue.id)}>
                  <div className="flex items-center gap-1">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span>{dialogue.message_count}</span>
                  </div>
                </TableCell>
                <TableCell onClick={() => handleViewDetail(dialogue.id)}>
                  <div className={`flex items-center gap-1 ${getSentimentColor(dialogue.sentiment_score)}`}>
                    {dialogue.sentiment_score !== undefined && (
                      <span>{dialogue.sentiment_score > 0 ? '😊' : dialogue.sentiment_score < 0 ? '😞' : '😐'}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell onClick={() => handleViewDetail(dialogue.id)}>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {format(new Date(dialogue.last_message_at), 'HH:mm', { locale: zhCN })}
                  </div>
                </TableCell>
                <TableCell onClick={() => handleViewDetail(dialogue.id)}>
                  {format(new Date(dialogue.created_at), 'MM-dd HH:mm', { locale: zhCN })}
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">打开菜单</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>操作</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => handleViewDetail(dialogue.id)}>
                        <Eye className="h-4 w-4 mr-2" />
                        查看详情
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleFlagDialogue(dialogue.id)}>
                        <Flag className="h-4 w-4 mr-2" />
                        标记关注
                      </DropdownMenuItem>
                      {dialogue.status === 'active' && (
                        <DropdownMenuItem onClick={() => handleEndDialogue(dialogue.id)}>
                          <Ban className="h-4 w-4 mr-2" />
                          结束对话
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600">
                        删除对话
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <div className="text-sm text-muted-foreground">
              第 {page} 页，共 {totalPages} 页
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                上一页
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
              >
                下一页
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}