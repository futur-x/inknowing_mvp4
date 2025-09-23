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

interface RecentUser {
  id: string;
  username: string;
  created_at: string;
  membership: string;
}

interface RecentUsersTableProps {
  users: RecentUser[];
  className?: string;
}

const RecentUsersTable: React.FC<RecentUsersTableProps> = ({ users, className = "" }) => {
  const getMembershipBadge = (membership: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      free: "outline",
      basic: "secondary",
      premium: "default",
      super: "destructive"
    };

    const labels: Record<string, string> = {
      free: "免费",
      basic: "基础",
      premium: "高级",
      super: "超级"
    };

    return (
      <Badge variant={variants[membership] || "outline"}>
        {labels[membership] || membership}
      </Badge>
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>最新注册用户</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>用户名</TableHead>
              <TableHead>注册时间</TableHead>
              <TableHead>会员类型</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.username}</TableCell>
                <TableCell>
                  {new Date(user.created_at).toLocaleString('zh-CN')}
                </TableCell>
                <TableCell>
                  {getMembershipBadge(user.membership)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default RecentUsersTable;