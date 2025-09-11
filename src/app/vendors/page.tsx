'use client'

import { useState } from 'react'
import { VendorSelectionPage, VendorContactsPage } from '@/components/vendor'
import { mockVendors, mockContacts } from '@/lib/mock-vendor-data'
import { Vendor, Contact } from '@/types/vendor'

type ViewState = 
  | { type: 'selection' }
  | { type: 'contacts'; vendor: Vendor }

export default function VendorsPage() {
  const [viewState, setViewState] = useState<ViewState>({ type: 'selection' })
  const [vendors] = useState(mockVendors)
  const [contacts] = useState(mockContacts)

  const handleVendorSelect = (vendor: Vendor) => {
    setViewState({ type: 'contacts', vendor })
  }

  const handleBack = () => {
    setViewState({ type: 'selection' })
  }

  const handleVendorSwitch = () => {
    setViewState({ type: 'selection' })
  }

  const handleAddVendor = () => {
    console.log('Add vendor clicked')
    // 這裡可以開啟新增廠商的對話框或導航到新增頁面
  }

  const handleAddContact = () => {
    console.log('Add contact clicked')
    // 這裡可以開啟新增聯絡人的對話框或導航到新增頁面
  }

  const handleEditContact = (contact: Contact) => {
    console.log('Edit contact:', contact)
    // 這裡可以開啟編輯聯絡人的對話框或導航到編輯頁面
  }

  const handleCallContact = (phone: string) => {
    console.log('Call contact:', phone)
    // 這裡可以集成電話系統或複製到剪貼板
    navigator.clipboard.writeText(phone)
  }

  const handleEmailContact = (email: string) => {
    console.log('Email contact:', email)
    // 這裡可以開啟郵件客戶端或複製到剪貼板
    window.open(`mailto:${email}`)
  }

  if (viewState.type === 'selection') {
    return (
      <VendorSelectionPage
        vendors={vendors}
        onVendorSelect={handleVendorSelect}
        onAddVendor={handleAddVendor}
      />
    )
  }

  if (viewState.type === 'contacts') {
    const vendorContacts = contacts.filter(
      contact => contact.vendorId === viewState.vendor.id
    )

    return (
      <VendorContactsPage
        vendor={viewState.vendor}
        contacts={vendorContacts}
        onBack={handleBack}
        onVendorSwitch={handleVendorSwitch}
        onAddContact={handleAddContact}
        onEditContact={handleEditContact}
        onCallContact={handleCallContact}
        onEmailContact={handleEmailContact}
      />
    )
  }

  return null
}