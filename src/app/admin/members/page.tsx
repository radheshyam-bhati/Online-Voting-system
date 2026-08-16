"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, Search, MoreHorizontal, Edit, Trash2, CheckCircle, XCircle, Loader2, Upload, Download, FileText } from "lucide-react";
import { format } from "date-fns";

interface Member {
  id: string;
  fullName: string;
  email: string;
  enrollmentNo: string | null;
  campusId: string | null;
  isAdmin: boolean;
  isActive: boolean;
  createdAt: string;
  roleTitle: string | null;
  displayOrder: number | null;
  isPublic: boolean | null;
  joinedAt: string | null;
}

interface JoinRequest {
  id: string;
  fullName: string;
  enrollmentNo: string;
  contactEmail: string;
  message: string | null;
  status: "pending" | "approved" | "declined";
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewerName: string | null;
}

export default function AdminMembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "declined">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editForm, setEditForm] = useState({ roleTitle: "", displayOrder: 999, isPublic: false, isActive: true });
  const [submitting, setSubmitting] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; errors: Array<{ row: number; error: string; data: unknown }> } | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);

  const fetchData = async () => {
    try {
      const [membersRes, requestsRes] = await Promise.all([
        fetch("/api/admin/members"),
        fetch("/api/admin/join-requests"),
      ]);
      const [membersData, requestsData] = await Promise.all([
        membersRes.json(),
        requestsRes.json(),
      ]);
      setMembers(membersData);
      setJoinRequests(requestsData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = (member: Member) => {
    setEditingMember(member);
    setEditForm({
      roleTitle: member.roleTitle || "",
      displayOrder: member.displayOrder || 999,
      isPublic: member.isPublic || false,
      isActive: member.isActive,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingMember) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/members/${editingMember.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        setMembers(members.map((m) => (m.id === editingMember.id ? { ...m, ...editForm } : m)));
        setEditingMember(null);
      }
    } catch (error) {
      console.error("Failed to update member:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReviewRequest = async (requestId: string, action: "approve" | "decline") => {
    try {
      const res = await fetch(`/api/admin/join-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setJoinRequests(joinRequests.map((r) => (r.id === requestId ? { ...r, status: action === "approve" ? "approved" : "declined" } : r)));
        fetchData(); // Refresh members list too
      }
    } catch (error) {
      console.error("Failed to review request:", error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    setImportResult(null);

    const formData = new FormData();
    formData.append("file", importFile);

    try {
      const res = await fetch("/api/admin/students/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setImportResult(data);
      if (data.success > 0) {
        fetchData(); // Refresh members list
        setImportFile(null);
      }
    } catch (error) {
      console.error("Import failed:", error);
      setImportResult({ success: 0, errors: [{ row: 0, error: "Import failed", data: {} }] });
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = "email,fullName,enrollmentNo,campusId,password,roleTitle,isPublic\nstudent@college.edu,John Doe,STU2024001,,password123,,\n";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "student-import-template.csv";
    link.click();
  };

  const filteredMembers = members.filter((m) =>
    m.fullName.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase()) ||
    m.enrollmentNo?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredRequests = joinRequests.filter((r) =>
    statusFilter === "all" || r.status === statusFilter
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-primary">Members Management</h1>
          <p className="text-muted-foreground">Manage members, roles, and join requests</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={downloadTemplate} className="gap-2">
            <Download className="w-4 h-4" />
            Download Template
          </Button>
          <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
            <DialogTrigger>
              <Button className="gap-2">
                <Upload className="w-4 h-4" />
                Import Students
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Import Students from CSV</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="text-sm text-muted-foreground">
                  <p>Upload a CSV file with student data. Required columns: email, fullName, enrollmentNo</p>
                  <p className="mt-2">Optional columns: campusId, password, roleTitle, isPublic</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="csvFile">CSV File</Label>
                  <Input
                    id="csvFile"
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    disabled={importing}
                  />
                  {importFile && (
                    <p className="text-sm text-muted-foreground">Selected: {importFile.name}</p>
                  )}
                </div>
                {importResult && (
                  <div className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">Import Results</h4>
                      <Badge variant={importResult.success > 0 ? "default" : "destructive"}>
                        {importResult.success} imported
                      </Badge>
                    </div>
                    {importResult.errors.length > 0 && (
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {importResult.errors.slice(0, 10).map((err, idx) => (
                          <div key={idx} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                            Row {err.row}: {err.error}
                          </div>
                        ))}
                        {importResult.errors.length > 10 && (
                          <p className="text-sm text-muted-foreground">... and {importResult.errors.length - 10} more errors</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => { setImportDialogOpen(false); setImportResult(null); setImportFile(null); }}>
                    Close
                  </Button>
                  <Button onClick={handleImport} disabled={importing || !importFile}>
                    {importing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Import Students
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-heading flex items-center gap-2">
              <Users className="w-5 h-5" />
              Join Requests
            </CardTitle>
            <Badge variant={joinRequests.filter(r => r.status === "pending").length > 0 ? "destructive" : "secondary"}>
              {joinRequests.filter(r => r.status === "pending").length} Pending
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 mb-4">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "pending" | "approved" | "declined" | "all")}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Enrollment</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No join requests found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">{request.fullName}</TableCell>
                        <TableCell className="font-mono text-sm">{request.enrollmentNo}</TableCell>
                        <TableCell>{request.contactEmail}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              request.status === "pending" ? "secondary" :
                              request.status === "approved" ? "default" : "destructive"
                            }
                          >
                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {request.status === "pending" && (
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleReviewRequest(request.id, "approve")}
                                className="gap-1"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                Approve
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleReviewRequest(request.id, "decline")}
                                className="gap-1"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Decline
                              </Button>
                            </div>
                          )}
                          {request.status !== "pending" && (
                            <Badge variant="outline" className="text-xs">
                              Reviewed {request.reviewedAt ? format(new Date(request.reviewedAt), "MMM d, yyyy") : ""}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <Users className="w-5 h-5" />
              Members Directory
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 mb-4">
              <Input
                placeholder="Search members..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-[300px]"
              />
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Enrollment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMembers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No members found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMembers.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">{member.fullName}</TableCell>
                        <TableCell>
                          {member.roleTitle ? (
                            <Badge variant={member.isPublic ? "default" : "secondary"}>
                              {member.roleTitle}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">Member</span>
                          )}
                        </TableCell>
                        <TableCell>{member.email}</TableCell>
                        <TableCell className="font-mono text-sm">{member.enrollmentNo || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={member.isActive ? "default" : "destructive"}>
                            {member.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditClick(member)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Member: {editingMember?.fullName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="roleTitle">Role Title</Label>
              <Input
                id="roleTitle"
                value={editForm.roleTitle}
                onChange={(e) => setEditForm({ ...editForm, roleTitle: e.target.value })}
                placeholder="e.g., President, Treasurer"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayOrder">Display Order</Label>
              <Input
                id="displayOrder"
                type="number"
                value={editForm.displayOrder}
                onChange={(e) => setEditForm({ ...editForm, displayOrder: parseInt(e.target.value) || 999 })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="checkbox"
                id="isPublic"
                checked={editForm.isPublic}
                onChange={(e) => setEditForm({ ...editForm, isPublic: e.target.checked })}
              />
              <Label htmlFor="isPublic">Public Profile</Label>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="checkbox"
                id="isActive"
                checked={editForm.isActive}
                onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
              />
              <Label htmlFor="isActive">Active Member</Label>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setEditingMember(null)}>Cancel</Button>
              <Button onClick={handleSaveEdit} disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}