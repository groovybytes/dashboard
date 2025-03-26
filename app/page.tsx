import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppSidebar } from "@/components/app-sidebar";
import { LineChart } from "lucide-react";

// import { decryptJWE } from "@/lib/auth/jwt";
// import { cookies } from "next/headers";
import Link from "next/link";

export default async function HomePage() {
  // const cookieStore = await cookies();
  // const session = cookieStore.get("session")?.value;

  // const profile = session ? await decryptJWE(session!) : null;
  const profile = null;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex flex-col gap-6 p-6">
          <div>{JSON.stringify(profile)}</div>
          <div className="flex gap-1">
            <Link
              className="flex px-3 py-1.5 rounded-md hover:bg-slate-400/20"
              href="/login"
            >
              Login
            </Link>
            <Link
              className="flex px-3 py-1.5 rounded-md hover:bg-slate-400/20"
              href="/logout"
            >
              Logout
            </Link>
          </div>

          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          </div>

          <Tabs defaultValue="overview">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="relationships">Relationships</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Cost Savings
                </CardTitle>
                <LineChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$123,456</div>
                <p className="text-xs text-muted-foreground">
                  Potential Savings Identified
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Patterns
                </CardTitle>
                <LineChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">24</div>
                <p className="text-xs text-muted-foreground">
                  Across All Systems
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Daily Usage Patterns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px] w-full rounded-md border" />
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

