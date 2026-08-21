"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Bell, Plus, Edit, Trash2, Loader2, MoreHorizontal } from "lucide-react";
import { format } from "date-fns";

interface Event {
  id: string;
  title: string;
  description: string;
  location: string | null;
  startsAt: string;
  endsAt: string | null;
  imageUrl: string | null;
  rsvpEnabled: boolean;
  createdAt: string;
  deletedAt: string | null;
}

interface Announcement {
  id: string;
  title: string;
  body: string;
  imageUrl: string | null;
  visibility: "public" | "members_only";
  publishedAt: string;
  deletedAt: string | null;
}

type ActiveTab = "events" | "announcements";

export default function AdminContentPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("events");
  const [events, setEvents] = useState<Event[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [eventForm, setEventForm] = useState({
    title: "", description: "", location: "", startsAt: "", endsAt: "", imageUrl: "", rsvpEnabled: false
  });
  const [announcementForm, setAnnouncementForm] = useState({
    title: "", body: "", imageUrl: "", visibility: "public" as "public" | "members_only"
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [eventsRes, announcementsRes] = await Promise.all([
        fetch("/api/admin/events"),
        fetch("/api/admin/announcements"),
      ]);
      const [eventsData, announcementsData] = await Promise.all([
        eventsRes.json(),
        announcementsRes.json(),
      ]);
      setEvents(eventsData);
      setAnnouncements(announcementsData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEventSubmit = async (isNew: boolean) => {
    setSubmitting(true);
    try {
      const url = isNew ? "/api/admin/events" : `/api/admin/events/${editingEvent?.id}`;
      const method = isNew ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...eventForm,
          startsAt: new Date(eventForm.startsAt).toISOString(),
          endsAt: eventForm.endsAt ? new Date(eventForm.endsAt).toISOString() : null,
        }),
      });
      if (res.ok) {
        fetchData();
        setEditingEvent(null);
      }
    } catch (error) {
      console.error("Failed to save event:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAnnouncementSubmit = async (isNew: boolean) => {
    setSubmitting(true);
    try {
      const url = isNew ? "/api/admin/announcements" : `/api/admin/announcements/${editingAnnouncement?.id}`;
      const method = isNew ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(announcementForm),
      });
      if (res.ok) {
        fetchData();
        setEditingAnnouncement(null);
      }
    } catch (error) {
      console.error("Failed to save announcement:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("Delete this event? This action cannot be undone.")) return;
    try {
      await fetch(`/api/admin/events/${eventId}`, { method: "DELETE" });
      fetchData();
    } catch (error) {
      console.error("Failed to delete event:", error);
    }
  };

  const handleDeleteAnnouncement = async (announcementId: string) => {
    if (!confirm("Delete this announcement? This action cannot be undone.")) return;
    try {
      await fetch(`/api/admin/announcements/${announcementId}`, { method: "DELETE" });
      fetchData();
    } catch (error) {
      console.error("Failed to delete announcement:", error);
    }
  };

  const openEventDialog = (event?: Event) => {
    if (event) {
      setEditingEvent(event);
      setEventForm({
        title: event.title,
        description: event.description,
        location: event.location || "",
        startsAt: new Date(event.startsAt).toISOString().slice(0, 16),
        endsAt: event.endsAt ? new Date(event.endsAt).toISOString().slice(0, 16) : "",
        imageUrl: event.imageUrl || "",
        rsvpEnabled: event.rsvpEnabled,
      });
    } else {
      setEditingEvent(null);
      setEventForm({ title: "", description: "", location: "", startsAt: "", endsAt: "", imageUrl: "", rsvpEnabled: false });
    }
  };

  const openAnnouncementDialog = (announcement?: Announcement) => {
    if (announcement) {
      setEditingAnnouncement(announcement);
      setAnnouncementForm({
        title: announcement.title,
        body: announcement.body,
        imageUrl: announcement.imageUrl || "",
        visibility: announcement.visibility,
      });
    } else {
      setEditingAnnouncement(null);
      setAnnouncementForm({ title: "", body: "", imageUrl: "", visibility: "public" });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-primary">Content Management</h1>
          <p className="text-muted-foreground">Manage events and announcements</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={activeTab === "events" ? "default" : "outline"}
            onClick={() => setActiveTab("events")}
            className="gap-2"
          >
            <Calendar className="w-4 h-4" />
            Events
          </Button>
          <Button
            variant={activeTab === "announcements" ? "default" : "outline"}
            onClick={() => setActiveTab("announcements")}
            className="gap-2"
          >
            <Bell className="w-4 h-4" />
            Announcements
          </Button>
        </div>
      </div>

      {activeTab === "events" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-heading flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Events
            </CardTitle>
            <Dialog>
              <DialogTrigger>
                <Button className="gap-2"><Plus className="w-4 h-4" /> Add Event</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingEvent ? "Edit Event" : "Create Event"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="eventTitle">Title</Label>
                    <Input
                      id="eventTitle"
                      value={eventForm.title}
                      onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="eventDescription">Description</Label>
                    <Textarea
                      id="eventDescription"
                      value={eventForm.description}
                      onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                      rows={4}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="eventLocation">Location (Optional)</Label>
                    <Input
                      id="eventLocation"
                      value={eventForm.location}
                      onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                      placeholder="Room 101, Main Building"
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="eventStartsAt">Start Date & Time</Label>
                      <Input
                        id="eventStartsAt"
                        type="datetime-local"
                        value={eventForm.startsAt}
                        onChange={(e) => setEventForm({ ...eventForm, startsAt: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="eventEndsAt">End Date & Time (Optional)</Label>
                      <Input
                        id="eventEndsAt"
                        type="datetime-local"
                        value={eventForm.endsAt}
                        onChange={(e) => setEventForm({ ...eventForm, endsAt: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="eventImageUrl">Image URL (Optional)</Label>
                    <Input
                      id="eventImageUrl"
                      value={eventForm.imageUrl}
                      onChange={(e) => setEventForm({ ...eventForm, imageUrl: e.target.value })}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="checkbox"
                      id="eventRsvpEnabled"
                      checked={eventForm.rsvpEnabled}
                      onChange={(e) => setEventForm({ ...eventForm, rsvpEnabled: e.target.checked })}
                    />
                    <Label htmlFor="eventRsvpEnabled">Enable RSVP</Label>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setEditingEvent(null)}>Cancel</Button>
                    <Button onClick={() => handleEventSubmit(!editingEvent)} disabled={submitting}>
                      {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      {editingEvent ? "Update Event" : "Create Event"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading events...</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>RSVP</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No events yet. Create your first event!
                        </TableCell>
                      </TableRow>
                    ) : (
                      events.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell className="font-medium">{event.title}</TableCell>
                          <TableCell>
                            {format(new Date(event.startsAt), "MMM d, yyyy h:mm a")}
                            {event.endsAt && ` – ${format(new Date(event.endsAt), "h:mm a")}`}
                          </TableCell>
                          <TableCell>{event.location || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={event.rsvpEnabled ? "default" : "outline"}>
                              {event.rsvpEnabled ? "Enabled" : "Disabled"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={event.deletedAt ? "destructive" : "default"}>
                              {event.deletedAt ? "Deleted" : "Active"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => openEventDialog(event)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteEvent(event.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "announcements" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-heading flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Announcements
            </CardTitle>
            <Dialog>
              <DialogTrigger>
                <Button className="gap-2"><Plus className="w-4 h-4" /> Add Announcement</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingAnnouncement ? "Edit Announcement" : "Create Announcement"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="announcementTitle">Title</Label>
                    <Input
                      id="announcementTitle"
                      value={announcementForm.title}
                      onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="announcementBody">Body</Label>
                    <Textarea
                      id="announcementBody"
                      value={announcementForm.body}
                      onChange={(e) => setAnnouncementForm({ ...announcementForm, body: e.target.value })}
                      rows={6}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="announcementImageUrl">Image URL (Optional)</Label>
                    <Input
                      id="announcementImageUrl"
                      value={announcementForm.imageUrl}
                      onChange={(e) => setAnnouncementForm({ ...announcementForm, imageUrl: e.target.value })}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="announcementVisibility">Visibility</Label>
                    <Select value={announcementForm.visibility} onValueChange={(v) => setAnnouncementForm({ ...announcementForm, visibility: v as "public" | "members_only" })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select visibility" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="members_only">Members Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setEditingAnnouncement(null)}>Cancel</Button>
                    <Button onClick={() => handleAnnouncementSubmit(!editingAnnouncement)} disabled={submitting}>
                      {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      {editingAnnouncement ? "Update Announcement" : "Create Announcement"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading announcements...</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Published</TableHead>
                      <TableHead>Visibility</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {announcements.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No announcements yet. Create your first announcement!
                        </TableCell>
                      </TableRow>
                    ) : (
                      announcements.map((ann) => (
                        <TableRow key={ann.id}>
                          <TableCell className="font-medium max-w-xs truncate">{ann.title}</TableCell>
                          <TableCell>{format(new Date(ann.publishedAt), "MMM d, yyyy h:mm a")}</TableCell>
                          <TableCell>
                            <Badge variant={ann.visibility === "public" ? "default" : "secondary"}>
                              {ann.visibility.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={ann.deletedAt ? "destructive" : "default"}>
                              {ann.deletedAt ? "Deleted" : "Active"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => openAnnouncementDialog(ann)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteAnnouncement(ann.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}