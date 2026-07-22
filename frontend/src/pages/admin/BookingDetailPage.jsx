import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FiArrowLeft,
  FiCheck,
  FiClock,
  FiMapPin,
  FiMessageCircle,
  FiNavigation,
  FiPhone,
  FiX,
} from "react-icons/fi";
import api from "@/lib/api";
import { getApiData } from "@/lib/apiHelpers";
import { formatCurrency, formatDate, formatSlotRange } from "@/lib/format";
import { runAdminWhatsAppAction } from "@/lib/whatsapp";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export default function BookingDetailPage() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [timeExtendOpen, setTimeExtendOpen] = useState(false);
  const [proposedSlot, setProposedSlot] = useState("");
  const actionLock = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/bookings/${id}`);
      setBooking(getApiData(res));
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    api.get("/admin/slots").then((r) => setSlots(getApiData(r)));
  }, [load]);

  const runAction = async (fn) => {
    if (actionLock.current || actionLoading) return;
    actionLock.current = true;
    setActionLoading(true);
    try {
      const data = await fn();
      if (data.booking) setBooking(data.booking);
      return data;
    } catch (e) {
      toast.error(e.message);
      throw e;
    } finally {
      setActionLoading(false);
      actionLock.current = false;
    }
  };

  const accept = () =>
    runAction(async () => {
      const data = await runAdminWhatsAppAction(async () =>
        getApiData(await api.post(`/admin/bookings/${id}/accept`)),
      );
      toast.success("Booking accepted");
      return data;
    });

  const reject = () =>
    runAction(async () => {
      const data = await runAdminWhatsAppAction(async () =>
        getApiData(await api.post(`/admin/bookings/${id}/reject`)),
      );
      toast.success("Booking rejected");
      return data;
    });

  const inquiry = () =>
    runAction(async () => {
      setMoreOpen(false);
      return runAdminWhatsAppAction(async () =>
        getApiData(await api.post(`/admin/bookings/${id}/inquiry`)),
      );
    });

  const timeExtend = () =>
    runAction(async () => {
      if (!proposedSlot) {
        toast.error("Select a proposed slot");
        return;
      }
      setTimeExtendOpen(false);
      return runAdminWhatsAppAction(async () =>
        getApiData(
          await api.post(`/admin/bookings/${id}/time-extend`, {
            proposed_slot_id: Number(proposedSlot),
          }),
        ),
      );
    });

  const complete = () =>
    runAction(async () => {
      const data = getApiData(await api.post(`/admin/bookings/${id}/complete`));
      toast.success("Marked completed");
      return data;
    });

  const undoAccept = () =>
    runAction(async () => {
      const data = getApiData(await api.post(`/admin/bookings/${id}/undo-accept`));
      toast.success("Acceptance undone");
      return data;
    });

  if (loading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (!booking) {
    return <p>Booking not found</p>;
  }

  const mapsUrl =
    booking.latitude && booking.longitude
      ? `https://www.google.com/maps/dir/?api=1&destination=${booking.latitude},${booking.longitude}`
      : null;

  const pending = booking.status === "Pending";
  const accepted = booking.status === "Accepted";
  const completed = booking.status === "Completed";

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm">
        <Link to="/admin/bookings">
          <FiArrowLeft aria-hidden />
          Back to bookings
        </Link>
      </Button>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold">{booking.booking_number}</h1>
        <StatusBadge status={booking.status} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Patient</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="text-lg font-medium">{booking.patient_name}</p>
            <p>
              {booking.age} · {booking.sex}
            </p>
            <p>{booking.phone}</p>
            {booking.patient_note && <p className="text-muted">Note: {booking.patient_note}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FiMapPin aria-hidden />
              Address
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>{booking.address}</p>
            {booking.house_no && <p>House: {booking.house_no}</p>}
            {booking.landmark && <p>Landmark: {booking.landmark}</p>}
            {booking.floor && <p>Floor: {booking.floor}</p>}
            {booking.latitude && (
              <p className="text-muted text-xs">
                GPS: {booking.latitude}, {booking.longitude}
              </p>
            )}
            {mapsUrl && (
              <Button asChild variant="outline" size="sm">
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                  <FiNavigation aria-hidden />
                  Navigate
                </a>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Schedule & tests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            {formatDate(booking.preferred_date)} ·{" "}
            {formatSlotRange(booking.slot_start, booking.slot_end)}
          </p>
          {booking.package_name && <p>Package: {booking.package_name}</p>}
          {booking.tests?.length > 0 && (
            <ul className="list-inside list-disc">
              {booking.tests.map((t) => (
                <li key={t.id}>
                  {t.test_name_at_booking} — {formatCurrency(t.price_at_booking)}
                </li>
              ))}
            </ul>
          )}
          <p className="font-semibold">Total: {formatCurrency(booking.total_price)}</p>
          {booking.prescription_image_url && (
            <a
              href={booking.prescription_image_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              View prescription
            </a>
          )}
          {booking.assigned_technician_name && (
            <p>
              Technician: {booking.assigned_technician_name} ({booking.assigned_technician_phone})
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 border-l-2 border-primary-light pl-4">
            {booking.timeline?.map((ev) => (
              <li key={ev.id} className="text-sm">
                <p className="font-medium">{ev.action}</p>
                <p className="text-muted">{ev.description}</p>
                <p className="text-muted text-xs">
                  {ev.performed_by} · {new Date(ev.created_at).toLocaleString()}
                </p>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <div className="sticky bottom-0 flex flex-wrap gap-2 border-t border-border bg-surface py-4">
        {pending && (
          <>
            <Button type="button" disabled={actionLoading} onClick={accept}>
              <FiCheck aria-hidden />
              Accept
            </Button>
            <Button type="button" variant="destructive" disabled={actionLoading} onClick={reject}>
              <FiX aria-hidden />
              Reject
            </Button>
            <Button type="button" variant="outline" onClick={() => setMoreOpen(true)}>
              More
            </Button>
          </>
        )}
        {accepted && (
          <>
            {mapsUrl && (
              <Button asChild variant="outline">
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                  <FiNavigation aria-hidden />
                  Navigate
                </a>
              </Button>
            )}
            <Button asChild variant="outline">
              <a href={`tel:${booking.phone}`}>
                <FiPhone aria-hidden />
                Call
              </a>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                window.open(`https://wa.me/${booking.phone.replace(/\D/g, "")}`, "_blank")
              }
            >
              <FiMessageCircle aria-hidden />
              WhatsApp
            </Button>
            <Button type="button" disabled={actionLoading} onClick={complete}>
              Complete
            </Button>
            <Button type="button" variant="ghost" disabled={actionLoading} onClick={undoAccept}>
              Undo Accept
            </Button>
          </>
        )}
        {completed && <p className="text-muted text-sm">View timeline above.</p>}
        {!pending && !accepted && !completed && (
          <Button asChild variant="outline">
            <a href={`tel:${booking.phone}`}>
              <FiPhone aria-hidden />
              Call patient
            </a>
          </Button>
        )}
      </div>

      <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
        <DialogTitle>More actions</DialogTitle>
        <DialogDescription>Contact patient or request schedule changes.</DialogDescription>
        <div className="mt-4 flex flex-col gap-2">
          <Button asChild variant="outline">
            <a href={`tel:${booking.phone}`}>
              <FiPhone aria-hidden />
              Call
            </a>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              window.open(`https://wa.me/${booking.phone.replace(/\D/g, "")}`, "_blank")
            }
          >
            <FiMessageCircle aria-hidden />
            WhatsApp
          </Button>
          <Button type="button" variant="outline" disabled={actionLoading} onClick={inquiry}>
            Inquiry
          </Button>
          <Button type="button" variant="outline" onClick={() => setTimeExtendOpen(true)}>
            <FiClock aria-hidden />
            Time extend
          </Button>
          {mapsUrl && (
            <Button asChild variant="outline">
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                Navigate
              </a>
            </Button>
          )}
        </div>
      </Dialog>

      <Dialog open={timeExtendOpen} onOpenChange={setTimeExtendOpen}>
        <DialogTitle>Propose new time</DialogTitle>
        <DialogDescription>Select a slot to request from the patient.</DialogDescription>
        <select
          className="border-input bg-surface mt-4 h-10 w-full rounded-md border px-2"
          value={proposedSlot}
          onChange={(e) => setProposedSlot(e.target.value)}
        >
          <option value="">Select slot</option>
          {slots.map((s) => (
            <option key={s.id} value={s.id}>
              {formatSlotRange(s.start_time, s.end_time)}
            </option>
          ))}
        </select>
        <Button type="button" className="mt-4 w-full" disabled={actionLoading} onClick={timeExtend}>
          Send time adjustment
        </Button>
      </Dialog>
    </div>
  );
}
