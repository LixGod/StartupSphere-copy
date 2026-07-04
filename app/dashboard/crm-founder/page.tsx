"use client";

import React, { useState } from 'react';
import Dashboard from '@/components/founder-crm/Dashboard';
import KanbanBoard from '@/components/founder-crm/KanbanBoard';
import LeadManagement from '@/components/founder-crm/LeadManagement';
import GlobalInbox from '@/components/founder-crm/GlobalInbox';
import AutomationHub from '@/components/founder-crm/AutomationHub';
import Settings from '@/components/founder-crm/Settings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function CRMMasterDashboard() {
  return (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-950 h-screen text-white overflow-hidden">
      <div className="px-6 py-6 flex-1 overflow-hidden flex flex-col w-full">
        <Tabs defaultValue="dashboard" className="w-full h-full flex flex-col">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div className="px-2">
              <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                <div className="w-2 h-8 bg-indigo-600 rounded-full" />
                Founder CRM
              </h1>
              <p className="text-slate-400 text-sm mt-1 ml-5">Intelligent Pipeline & Outreach Engine</p>
            </div>
            <TabsList className="bg-slate-900/50 border border-slate-800 p-1 flex-wrap h-auto backdrop-blur-md rounded-2xl">
              <TabsTrigger value="dashboard" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-xl px-4 md:px-6 py-2.5 text-sm font-bold transition-all">Analytics</TabsTrigger>
              <TabsTrigger value="crm_leads" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-xl px-4 md:px-6 py-2.5 text-sm font-bold transition-all">Leads</TabsTrigger>
              <TabsTrigger value="pipeline" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-xl px-4 md:px-6 py-2.5 text-sm font-bold transition-all">Pipeline</TabsTrigger>
              <TabsTrigger value="inbox" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-xl px-4 md:px-6 py-2.5 text-sm font-bold transition-all">Inbox</TabsTrigger>
              <TabsTrigger value="automation" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-xl px-4 md:px-6 py-2.5 text-sm font-bold transition-all">Automation</TabsTrigger>
              <TabsTrigger value="settings" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white rounded-xl px-4 md:px-6 py-2.5 text-sm font-bold transition-all">Config</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 mt-4">
            <TabsContent value="dashboard" className="h-full m-0 p-0 outline-none"><Dashboard /></TabsContent>
            <TabsContent value="crm_leads" className="h-full m-0 p-0 outline-none"><LeadManagement /></TabsContent>
            <TabsContent value="pipeline" className="h-full m-0 p-0 outline-none"><KanbanBoard /></TabsContent>
            <TabsContent value="inbox" className="h-full m-0 p-0 outline-none"><GlobalInbox /></TabsContent>
            <TabsContent value="automation" className="h-full m-0 p-0 outline-none"><AutomationHub /></TabsContent>
            <TabsContent value="settings" className="h-full m-0 p-0 outline-none"><Settings /></TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}

