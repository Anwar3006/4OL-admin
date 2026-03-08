"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  TUserProfile,
} from "@/schemas/user-profile.schema";
import { Mail, Phone, Calendar, Shield } from "lucide-react";
import { format } from "date-fns";

interface ProfileHeaderProps {
  user: TUserProfile;
}

export function ProfileHeader({ user }: ProfileHeaderProps) {
  return (
    <Card className="border-none shadow-lg bg-gradient-to-br from-primary/5 via-background to-background">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
          {/* Avatar Section */}
          <div className="relative">
            <Avatar className="h-32 w-32 border-4 border-background shadow-xl">
              <AvatarImage src={user.image || undefined} alt={user.name} />
              <AvatarFallback className="text-4xl font-bold bg-zinc-800 text-white">
                {user.name ? user.name.charAt(0).toUpperCase() : "U"}
              </AvatarFallback>
            </Avatar>
            {user.email_verified && (
              <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full p-2 border-4 border-background shadow-lg">
                <Shield className="h-4 w-4 text-white" />
              </div>
            )}
          </div>

          {/* User Info Section */}
          <div className="flex-1 text-center md:text-left space-y-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {user.name}
              </h1>
              <div className="flex flex-wrap gap-2 justify-center md:justify-start mt-2">
                <Badge variant="secondary" className="capitalize">
                  <Shield className="h-3 w-3 mr-1" />
                  {user.role || "User"}
                </Badge>
                {user.email_verified && (
                  <Badge variant="default" className="bg-green-500">
                    Verified
                  </Badge>
                )}
              </div>
            </div>

            {/* Contact Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4 text-primary" />
                <span className="truncate">{user.email}</span>
              </div>
              {user.created_at && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span>
                    Member since {format(new Date(user.created_at), "MMM yyyy")}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
