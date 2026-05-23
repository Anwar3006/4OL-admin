"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useUsers } from "@/hooks/supabase-calls/useUser";
import { useDebounce } from "@/hooks/use-debounce";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserSearchSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export function UserSearchSelect({
  value,
  onValueChange,
  placeholder = "Select a user...",
}: UserSearchSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebounce(search, 500);

  const { data, isLoading } = useUsers({
    search: debouncedSearch,
    admin: false,
    limit: 10,
  });

  const users = data?.users || [];
  const selectedUser = users.find((u) => u.user_id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between rounded-xl h-10 px-3 font-normal"
        >
          {selectedUser ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarImage src={selectedUser.image || ""} />
                <AvatarFallback className="text-[8px] font-bold">
                  {selectedUser.first_name?.[0]}
                  {selectedUser.last_name?.[0]}
                </AvatarFallback>
              </Avatar>

              <span className="truncate">
                {selectedUser.first_name} {selectedUser.last_name}
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0 rounded-2xl overflow-hidden shadow-2xl border-none">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search by name or email..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-[300px]">
            {isLoading && (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
            {!isLoading && users.length === 0 && (
              <CommandEmpty>No users found.</CommandEmpty>
            )}
            <CommandGroup>
              {users.map((u) => (
                <CommandItem
                  key={u.user_id}
                  value={u.user_id}
                  onSelect={(currentValue) => {
                    onValueChange(currentValue === value ? "" : currentValue);
                    setOpen(false);
                  }}
                  className="flex items-center gap-3 p-3 cursor-pointer"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={u.image || ""} />
                    <AvatarFallback className="font-bold">
                      {u.first_name?.[0]}
                      {u.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col flex-1 overflow-hidden">
                    <span className="font-bold text-slate-900 truncate">
                      {u.first_name} {u.last_name}
                    </span>
                    <span className="text-xs text-slate-400 truncate">
                      {u.email}
                    </span>
                  </div>
                  <Check
                    className={cn(
                      "h-4 w-4 text-primary",
                      value === u.user_id ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
