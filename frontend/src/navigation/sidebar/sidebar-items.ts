import { type LucideIcon, Clock, FolderOpen, Home, KeyRound, Share2, ShieldCheck, Trash2, Users } from "lucide-react";

export interface NavSubItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  comingSoon?: boolean;
  isNew?: boolean;
  newTab?: boolean;
}

export interface NavMainItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  subItems?: NavSubItem[];
  comingSoon?: boolean;
  isNew?: boolean;
  adminOnly?: boolean;
  newTab?: boolean;
}

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
  adminOnly?: boolean;
}

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    items: [
      {
        title: "home",
        url: "/dashboard",
        icon: Home,
      },
    ],
  },
  {
    id: 2,
    label: "drive",
    items: [
      {
        title: "myDrive",
        url: "/dashboard/drive",
        icon: FolderOpen,
      },
      {
        title: "sharedWithMe",
        url: "/dashboard/drive/shared",
        icon: Share2,
      },
      {
        title: "recent",
        url: "/dashboard/drive/recent",
        icon: Clock,
      },
      {
        title: "trash",
        url: "/dashboard/drive/trash",
        icon: Trash2,
      },
    ],
  },
  {
    id: 3,
    label: "admin",
    adminOnly: true,
    items: [
      {
        title: "users",
        url: "/dashboard/users",
        icon: Users,
        adminOnly: true,
      },
      {
        title: "apiKeys",
        url: "/dashboard/api-keys",
        icon: KeyRound,
        adminOnly: true,
      },
      {
        title: "roles",
        url: "/dashboard/roles",
        icon: ShieldCheck,
        adminOnly: true,
      },
    ],
  },
];
