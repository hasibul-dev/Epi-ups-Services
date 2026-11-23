"use client";

import {
  Activity, AlertTriangle, ArrowRight, BookOpen, Briefcase, Building, Building2, CalendarCheck, CalendarClock, CalendarDays, CalendarPlus, CheckCircle2,
  ClipboardCheck, ClipboardList, Clock, CreditCard, Database, FileSpreadsheet, FileText, FolderTree, HardDriveDownload, Headphones, History, Landmark, Laptop, LayoutDashboard,
  ListChecks, Megaphone, Package, PhoneCall, PlusCircle, Receipt, Scale, ScrollText, Settings, Settings2, Share2, ShieldAlert, ShieldCheck,
  ShoppingCart, SlidersHorizontal, Ticket, TrendingDown, TrendingUp, Truck, UserCheck, UserPlus, Users, Wallet, Wrench, Zap, Circle,
  type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  Activity, AlertTriangle, ArrowRight, BookOpen, Briefcase, Building, Building2, CalendarCheck, CalendarClock, CalendarDays, CalendarPlus, CheckCircle2,
  ClipboardCheck, ClipboardList, Clock, CreditCard, Database, FileSpreadsheet, FileText, FolderTree, HardDriveDownload, Headphones, History, Landmark, Laptop, LayoutDashboard,
  ListChecks, Megaphone, Package, PhoneCall, PlusCircle, Receipt, Scale, ScrollText, Settings, Settings2, Share2, ShieldAlert, ShieldCheck,
  ShoppingCart, SlidersHorizontal, Ticket, TrendingDown, TrendingUp, Truck, UserCheck, UserPlus, Users, Wallet, Wrench, Zap,
};

export function Icon({ name, className }: { name: string; className?: string }) {
  const C = MAP[name] ?? Circle;
  return <C className={className ?? "h-5 w-5"} />;
}
