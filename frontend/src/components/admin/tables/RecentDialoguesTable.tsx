"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface RecentDialogue {
  id: string;
  user: string;
  book: string;
  created_at: string;
  status: string;
}

interface RecentDialoguesTableProps {
  dialogues: RecentDialogue[];
  className?: string;
}

const RecentDialoguesTable: React.FC<RecentDialoguesTableProps> = ({ dialogues, className = "" }) => {
  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      completed: "secondary",
      abandoned: "outline"
    };

    const labels: Record<string, string> = {
      active: "进行中",
      completed: "已完成",
      abandoned: "已放弃"
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {labels[status] || status}
      </Badge>
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>最近对话记录</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>用户</TableHead>
              <TableHead>书籍</TableHead>
              <TableHead>开始时间</TableHead>
              <TableHead>状态</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dialogues.map((dialogue) => (
              <TableRow key={dialogue.id}>
                <TableCell className="font-medium">{dialogue.user}</TableCell>
                <TableCell>{dialogue.book}</TableCell>
                <TableCell>
                  {new Date(dialogue.created_at).toLocaleString('zh-CN')}
                </TableCell>
                <TableCell>
                  {getStatusBadge(dialogue.status)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default RecentDialoguesTable;