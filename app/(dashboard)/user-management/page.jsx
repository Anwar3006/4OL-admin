'use client'
import HomeBredCurbs from '@/components/partials/HomeBredCurbs'
import CompanyTable from '@/components/partials/table/company-table'
import Card from '@/components/ui/Card'
import React from 'react'

export default function page() {
  return (
    <Card title="User Management">
      <CompanyTable />
    </Card>
  )
}
