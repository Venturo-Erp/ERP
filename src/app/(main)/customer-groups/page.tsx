'use client'

import { LABELS } from './constants/labels'

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { ListPageLayout } from '@/components/layout/list-page-layout'
import { Users, Edit2, Trash2, Plus, UserPlus, ChevronDown, ChevronRight } from 'lucide-react'
import {
  useCustomerGroups,
  createCustomerGroup,
  updateCustomerGroup,
  deleteCustomerGroup,
  useCustomerGroupMembers,
  createCustomerGroupMember,
  deleteCustomerGroupMember,
  useCustomers,
} from '@/data'
import { useAuthStore } from '@/stores'
import { confirm, alert } from '@/lib/ui/alert-dialog'
import { TableColumn } from '@/components/ui/enhanced-table'
import { DateCell, ActionCell, NumberCell } from '@/components/table-cells'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormDialog } from '@/components/dialog'
import { Combobox } from '@/components/ui/combobox'
import type { CustomerGroup, CustomerGroupMember, CustomerGroupType } from '@/stores/types'

const GROUP_TYPE_LABELS: Record<CustomerGroupType, string> = {
  family: LABELS.TYPE_FAMILY,
  company: LABELS.TYPE_COMPANY,
  club: LABELS.TYPE_CLUB,
  other: LABELS.TYPE_OTHER,
}

const GROUP_TYPE_COLORS: Record<CustomerGroupType, string> = {
  family: 'text-morandi-gold bg-morandi-gold/10',
  company: 'text-status-info bg-status-info-bg',
  club: 'text-morandi-green bg-morandi-green/10',
  other: 'text-morandi-secondary bg-morandi-container',
}

export default function CustomerGroupsPage() {
  const { user } = useAuthStore()
  const { items: groups } = useCustomerGroups()
  const createGroup = createCustomerGroup
  const updateGroup = updateCustomerGroup
  const deleteGroup = deleteCustomerGroup
  const { items: allMembers } = useCustomerGroupMembers()
  const createMember = createCustomerGroupMember
  const deleteMember = deleteCustomerGroupMember
  const { items: customers } = useCustomers()

  const [expandedGroups, setExpandedGroups] = useState<string[]>([])
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<CustomerGroup | null>(null)

  const [formData, setFormData] = useState<{
    name: string
    type: CustomerGroupType
    notes: string
  }>({
    name: '',
    type: 'other',
    notes: '',
  })
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')

  const getGroupMembers = useCallback(
    (groupId: string) => {
      return allMembers.filter(m => m.group_id === groupId)
    },
    [allMembers]
  )

  const getCustomerName = useCallback(
    (customerId: string) => {
      const customer = customers.find(c => c.id === customerId)
      return customer?.name || LABELS.UNKNOWN_CUSTOMER
    },
    [customers]
  )

  const toggleExpand = useCallback((groupId: string) => {
    setExpandedGroups(prev =>
      prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
    )
  }, [])

  const handleAddGroup = useCallback(async () => {
    if (!formData.name.trim()) {
      await alert(LABELS.ENTER_GROUP_NAME, 'warning')
      return
    }

    try {
      await createGroup({
        name: formData.name.trim(),
        type: formData.type,
        notes: formData.notes.trim() || null,
        created_by: user?.id || null,
      } as Omit<CustomerGroup, 'id' | 'created_at' | 'updated_at'>)

      setAddDialogOpen(false)
      setFormData({ name: '', type: 'other', notes: '' })
    } catch (error) {
      await alert(LABELS.CREATE_GROUP_FAILED, 'error')
    }
  }, [formData, createGroup, user?.id])

  const handleEditGroup = useCallback(async () => {
    if (!selectedGroup || !formData.name.trim()) {
      await alert(LABELS.ENTER_GROUP_NAME, 'warning')
      return
    }

    try {
      await updateGroup(selectedGroup.id, {
        name: formData.name.trim(),
        type: formData.type,
        notes: formData.notes.trim() || null,
      })

      setEditDialogOpen(false)
      setSelectedGroup(null)
      setFormData({ name: '', type: 'other', notes: '' })
    } catch (error) {
      await alert(LABELS.UPDATE_GROUP_FAILED, 'error')
    }
  }, [selectedGroup, formData, updateGroup])

  const handleDeleteGroup = useCallback(
    async (group: CustomerGroup) => {
      const members = getGroupMembers(group.id)
      if (members.length > 0) {
        await alert(
          `${LABELS.HAS_MEMBERS_PREFIX}${members.length}${LABELS.HAS_MEMBERS_SUFFIX}`,
          'warning'
        )
        return
      }

      const confirmed = await confirm(
        `${LABELS.CONFIRM_DELETE_PREFIX}${group.name}${LABELS.CONFIRM_DELETE_SUFFIX}`,
        {
          type: 'warning',
          title: LABELS.DELETE_GROUP_TITLE,
        }
      )

      if (confirmed) {
        try {
          await deleteGroup(group.id)
        } catch (error) {
          await alert(LABELS.DELETE_GROUP_FAILED, 'error')
        }
      }
    },
    [deleteGroup, getGroupMembers]
  )

  const openEditDialog = useCallback((group: CustomerGroup) => {
    setSelectedGroup(group)
    setFormData({
      name: group.name,
      type: group.type,
      notes: group.notes || '',
    })
    setEditDialogOpen(true)
  }, [])

  const openAddMemberDialog = useCallback((group: CustomerGroup) => {
    setSelectedGroup(group)
    setSelectedCustomerId('')
    setAddMemberDialogOpen(true)
  }, [])

  const handleAddMember = useCallback(async () => {
    if (!selectedGroup || !selectedCustomerId) {
      await alert(LABELS.SELECT_CUSTOMER, 'warning')
      return
    }

    const existingMember = allMembers.find(
      m => m.group_id === selectedGroup.id && m.customer_id === selectedCustomerId
    )
    if (existingMember) {
      await alert(LABELS.CUSTOMER_ALREADY_IN_GROUP, 'warning')
      return
    }

    try {
      await createMember({
        group_id: selectedGroup.id,
        customer_id: selectedCustomerId,
        role: 'member',
      })

      setAddMemberDialogOpen(false)
      setSelectedGroup(null)
      setSelectedCustomerId('')
    } catch (error) {
      await alert(LABELS.ADD_MEMBER_FAILED, 'error')
    }
  }, [selectedGroup, selectedCustomerId, allMembers, createMember])

  const handleRemoveMember = useCallback(
    async (member: CustomerGroupMember) => {
      const customerName = getCustomerName(member.customer_id)
      const confirmed = await confirm(
        `${LABELS.CONFIRM_REMOVE_PREFIX}${customerName}${LABELS.CONFIRM_REMOVE_SUFFIX}`,
        {
          type: 'warning',
          title: LABELS.REMOVE_MEMBER_TITLE,
        }
      )

      if (confirmed) {
        try {
          await deleteMember(member.id)
        } catch (error) {
          await alert(LABELS.REMOVE_MEMBER_FAILED, 'error')
        }
      }
    },
    [deleteMember, getCustomerName]
  )

  const availableCustomers = useMemo(() => {
    if (!selectedGroup) return customers
    const memberIds = allMembers
      .filter(m => m.group_id === selectedGroup.id)
      .map(m => m.customer_id)
    return customers.filter(c => !memberIds.includes(c.id))
  }, [selectedGroup, allMembers, customers])

  const columns: TableColumn<CustomerGroup>[] = useMemo(
    () => [
      {
        key: 'expand',
        label: '',
        width: '40px',
        render: (_, group) => {
          const isExpanded = expandedGroups.includes(group.id)
          const memberCount = getGroupMembers(group.id).length
          return (
            <button
              onClick={e => {
                e.stopPropagation()
                toggleExpand(group.id)
              }}
              className="p-1 hover:bg-morandi-container/50 rounded"
              disabled={memberCount === 0}
            >
              {isExpanded ? (
                <ChevronDown size={16} className="text-morandi-secondary" />
              ) : (
                <ChevronRight
                  size={16}
                  className={memberCount === 0 ? 'text-morandi-muted' : 'text-morandi-secondary'}
                />
              )}
            </button>
          )
        },
      },
      {
        key: 'name',
        label: LABELS.COL_GROUP_NAME,
        sortable: true,
        render: (_, group) => <div className="font-medium text-morandi-primary">{group.name}</div>,
      },
      {
        key: 'type',
        label: LABELS.COL_TYPE,
        sortable: true,
        width: '100px',
        render: (_, group) => (
          <span
            className={`px-2 py-1 rounded text-sm font-medium ${GROUP_TYPE_COLORS[group.type]}`}
          >
            {GROUP_TYPE_LABELS[group.type]}
          </span>
        ),
      },
      {
        key: 'member_count',
        label: LABELS.COL_MEMBER_COUNT,
        width: '80px',
        render: (_, group) => {
          const count = getGroupMembers(group.id).length
          return <NumberCell value={count} suffix={LABELS.MEMBER_UNIT} />
        },
      },
      {
        key: 'notes',
        label: LABELS.COL_REMARKS,
        render: (_, group) => (
          <span className="text-sm text-morandi-secondary">{group.notes || '-'}</span>
        ),
      },
      {
        key: 'created_at',
        label: LABELS.COL_CREATED_AT,
        sortable: true,
        width: '120px',
        render: (_, group) => <DateCell date={group.created_at} showIcon={false} />,
      },
    ],
    [expandedGroups, getGroupMembers, toggleExpand]
  )

  const renderActions = useCallback(
    (group: CustomerGroup) => (
      <ActionCell
        actions={[
          {
            icon: UserPlus,
            label: LABELS.ACTION_ADD_MEMBER,
            onClick: () => openAddMemberDialog(group),
          },
          {
            icon: Edit2,
            label: LABELS.ACTION_EDIT,
            onClick: () => openEditDialog(group),
          },
          {
            icon: Trash2,
            label: LABELS.ACTION_DELETE,
            onClick: () => handleDeleteGroup(group),
            variant: 'danger',
          },
        ]}
      />
    ),
    [openAddMemberDialog, openEditDialog, handleDeleteGroup]
  )

  const renderExpanded = useCallback(
    (group: CustomerGroup) => {
      const members = getGroupMembers(group.id)
      if (members.length === 0) {
        return (
          <div className="p-4 text-center text-morandi-secondary text-sm">{LABELS.NO_MEMBERS}</div>
        )
      }

      return (
        <div className="p-4 bg-morandi-container/20">
          <div className="text-sm font-medium text-morandi-primary mb-2">
            {LABELS.GROUP_MEMBERS}
          </div>
          <div className="flex flex-wrap gap-2">
            {members.map(member => {
              const customerName = getCustomerName(member.customer_id)
              return (
                <div
                  key={member.id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-card rounded-lg border border-border"
                >
                  <span className="text-sm text-morandi-primary">{customerName}</span>
                  <button
                    onClick={() => handleRemoveMember(member)}
                    className="text-morandi-muted hover:text-morandi-red transition-colors"
                    title={LABELS.LABEL_2634}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )
    },
    [getGroupMembers, getCustomerName, handleRemoveMember]
  )

  const statusTabs = useMemo(
    () => [
      { value: 'all', label: LABELS.TAB_ALL },
      { value: 'family', label: LABELS.TYPE_FAMILY },
      { value: 'company', label: LABELS.TYPE_COMPANY },
      { value: 'club', label: LABELS.TYPE_CLUB },
      { value: 'other', label: LABELS.TYPE_OTHER },
    ],
    []
  )

  return (
    <>
      <ListPageLayout
        title={LABELS.LABEL_6845}
        icon={Users}
        data={groups}
        columns={columns}
        searchFields={['name', 'notes']}
        searchPlaceholder={LABELS.SEARCH_PLACEHOLDER}
        statusTabs={statusTabs}
        statusField="type"
        defaultStatusTab="all"
        onRowClick={group => toggleExpand(group.id)}
        renderActions={renderActions}
        renderExpanded={renderExpanded}
        expandedRows={expandedGroups}
        onToggleExpand={toggleExpand}
        bordered={true}
        onAdd={() => {
          setFormData({ name: '', type: 'other', notes: '' })
          setAddDialogOpen(true)
        }}
        addLabel={LABELS.ADD_GROUP}
      />

      <FormDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        title={LABELS.ADD_9532}
        onSubmit={handleAddGroup}
        submitLabel={LABELS.SUBMIT_CREATE}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-morandi-primary mb-2 block">
              {LABELS.GROUP_NAME_LABEL} <span className="text-morandi-red">*</span>
            </label>
            <Input
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder={LABELS.EXAMPLE_933}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-morandi-primary mb-2 block">
              {LABELS.LABEL_5116}
            </label>
            <Combobox
              value={formData.type}
              onChange={type => setFormData(prev => ({ ...prev, type: type as CustomerGroupType }))}
              options={Object.entries(GROUP_TYPE_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
              placeholder={LABELS.SELECT_7211}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-morandi-primary mb-2 block">
              {LABELS.REMARKS}
            </label>
            <Input
              value={formData.notes}
              onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder={LABELS.OPTIONAL}
            />
          </div>
        </div>
      </FormDialog>

      <FormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        title={LABELS.EDIT_6630}
        onSubmit={handleEditGroup}
        submitLabel={LABELS.SUBMIT_SAVE}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-morandi-primary mb-2 block">
              {LABELS.GROUP_NAME_LABEL} <span className="text-morandi-red">*</span>
            </label>
            <Input
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder={LABELS.EXAMPLE_933}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-morandi-primary mb-2 block">
              {LABELS.LABEL_5116}
            </label>
            <Combobox
              value={formData.type}
              onChange={type => setFormData(prev => ({ ...prev, type: type as CustomerGroupType }))}
              options={Object.entries(GROUP_TYPE_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
              placeholder={LABELS.SELECT_7211}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-morandi-primary mb-2 block">
              {LABELS.REMARKS}
            </label>
            <Input
              value={formData.notes}
              onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder={LABELS.OPTIONAL}
            />
          </div>
        </div>
      </FormDialog>

      <FormDialog
        open={addMemberDialogOpen}
        onOpenChange={setAddMemberDialogOpen}
        title={`${LABELS.ADD_MEMBER_PREFIX}${selectedGroup?.name || ''}${LABELS.ADD_MEMBER_SUFFIX}`}
        onSubmit={handleAddMember}
        submitLabel={LABELS.ADD}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-morandi-primary mb-2 block">
              {LABELS.SELECT_CUSTOMER_LABEL} <span className="text-morandi-red">*</span>
            </label>
            <Combobox
              value={selectedCustomerId}
              onChange={setSelectedCustomerId}
              options={availableCustomers.map(c => ({
                value: c.id,
                label: `${c.name}${c.phone ? ` (${c.phone})` : ''}`,
              }))}
              placeholder={LABELS.SEARCH_1890}
              showSearchIcon={true}
              emptyMessage={LABELS.CUSTOMER_NOT_FOUND}
            />
          </div>
          {availableCustomers.length === 0 && (
            <p className="text-sm text-morandi-secondary">{LABELS.NOT_FOUND_6103}</p>
          )}
        </div>
      </FormDialog>
    </>
  )
}
