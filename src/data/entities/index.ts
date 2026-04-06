/**
 * Entities Export
 *
 * 所有 entity hooks 統一從這裡 export
 */

// ============================================
// 核心業務
// ============================================

// Tours
export {
  tourEntity,
  useTours,
  useToursSlim,
  useTour,
  useToursPaginated,
  useTourDictionary,
  useToursForCalendar,
  fetchTourIdByCode,
  createTour,
  updateTour,
  deleteTour,
  invalidateTours,
} from './tours'

// Orders
export {
  orderEntity,
  useOrders,
  useOrdersSlim,
  useOrder,
  useOrdersPaginated,
  useOrderDictionary,
  createOrder,
  updateOrder,
  deleteOrder,
  invalidateOrders,
} from './orders'

// Members
export {
  memberEntity,
  useMembers,
  useMembersSlim,
  useMember,
  useMembersPaginated,
  useMemberDictionary,
  createMember,
  updateMember,
  deleteMember,
  invalidateMembers,
} from './members'

// Customers
export {
  customerEntity,
  useCustomers,
  useCustomersSlim,
  useCustomer,
  useCustomersPaginated,
  useCustomerDictionary,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  invalidateCustomers,
} from './customers'

// ============================================
// 提案與報價
// ============================================

// Quotes
export {
  quoteEntity,
  useQuotes,
  useQuotesSlim,
  useQuote,
  useQuotesPaginated,
  useQuoteDictionary,
  createQuote,
  updateQuote,
  deleteQuote,
  invalidateQuotes,
} from './quotes'

// Itineraries
export {
  itineraryEntity,
  useItineraries,
  useItinerariesSlim,
  useItinerary,
  useItinerariesPaginated,
  useItineraryDictionary,
  createItinerary,
  updateItinerary,
  deleteItinerary,
  invalidateItineraries,
} from './itineraries'

// ============================================
// 財務管理
// ============================================

// Payment Requests
export {
  paymentRequestEntity,
  usePaymentRequests,
  usePaymentRequestsSlim,
  usePaymentRequest,
  usePaymentRequestsPaginated,
  usePaymentRequestDictionary,
  createPaymentRequest,
  updatePaymentRequest,
  deletePaymentRequest,
  invalidatePaymentRequests,
} from './payment-requests'

// Receipts (收款)
export {
  receiptEntity,
  useReceipts,
  useReceiptsSlim,
  useReceipt,
  useReceiptsPaginated,
  useReceiptDictionary,
  createReceipt,
  updateReceipt,
  deleteReceipt,
  invalidateReceipts,
} from './receipts'

// Disbursement Orders
export {
  disbursementOrderEntity,
  useDisbursementOrders,
  useDisbursementOrdersSlim,
  useDisbursementOrder,
  useDisbursementOrdersPaginated,
  useDisbursementOrderDictionary,
  createDisbursementOrder,
  updateDisbursementOrder,
  deleteDisbursementOrder,
  invalidateDisbursementOrders,
} from './disbursement-orders'

// Accounting Subjects
export {
  accountingSubjectEntity,
  useAccountingSubjects,
  useAccountingSubjectsSlim,
  useAccountingSubject,
  useAccountingSubjectsPaginated,
  useAccountingSubjectDictionary,
  createAccountingSubject,
  updateAccountingSubject,
  deleteAccountingSubject,
  invalidateAccountingSubjects,
} from './accounting-subjects'

// Workspace Modules
export {
  workspaceModuleEntity,
  useWorkspaceModules,
  useWorkspaceModulesSlim,
  useWorkspaceModule,
  useWorkspaceModulesPaginated,
  useWorkspaceModuleDictionary,
  createWorkspaceModule,
  updateWorkspaceModule,
  deleteWorkspaceModule,
  invalidateWorkspaceModules,
} from './workspace-modules'

// ============================================
// 人員管理
// ============================================

// Employees
export {
  employeeEntity,
  useEmployees,
  useEmployeesSlim,
  useEmployee,
  useEmployeesPaginated,
  useEmployeeDictionary,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  invalidateEmployees,
} from './employees'

// ============================================
// 業務支援
// ============================================

// Visas
export {
  visaEntity,
  useVisas,
  useVisasSlim,
  useVisa,
  useVisasPaginated,
  useVisaDictionary,
  createVisa,
  updateVisa,
  deleteVisa,
  invalidateVisas,
} from './visas'

// Todos
export {
  todoEntity,
  useTodos,
  useTodosSlim,
  useTodo,
  useTodosPaginated,
  useTodoDictionary,
  createTodo,
  updateTodo,
  deleteTodo,
  invalidateTodos,
} from './todos'

// Suppliers
export {
  supplierEntity,
  useSuppliers,
  useSuppliersSlim,
  useSupplier,
  useSuppliersPaginated,
  useSupplierDictionary,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  invalidateSuppliers,
} from './suppliers'

// Customer Groups
export {
  customerGroupEntity,
  useCustomerGroups,
  useCustomerGroupsSlim,
  useCustomerGroup,
  useCustomerGroupsPaginated,
  useCustomerGroupDictionary,
  createCustomerGroup,
  updateCustomerGroup,
  deleteCustomerGroup,
  invalidateCustomerGroups,
} from './customer-groups'

// Customer Group Members
export {
  customerGroupMemberEntity,
  useCustomerGroupMembers,
  useCustomerGroupMembersSlim,
  useCustomerGroupMember,
  useCustomerGroupMembersPaginated,
  useCustomerGroupMemberDictionary,
  createCustomerGroupMember,
  updateCustomerGroupMember,
  deleteCustomerGroupMember,
  invalidateCustomerGroupMembers,
} from './customer-group-members'

// Airport Images
export {
  airportImageEntity,
  useAirportImages,
  useAirportImagesSlim,
  useAirportImage,
  useAirportImagesPaginated,
  useAirportImageDictionary,
  createAirportImage,
  updateAirportImage,
  deleteAirportImage,
  invalidateAirportImages,
} from './airport-images'

// ============================================
// 地理資料
// ============================================

// Countries
export {
  countryEntity,
  useCountries,
  useCountriesSlim,
  useCountry,
  useCountriesPaginated,
  useCountryDictionary,
  createCountry,
  updateCountry,
  deleteCountry,
  invalidateCountries,
} from './countries'
export type { Country } from '@/stores/region-store'

export {
  useDepartments,
  useDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  invalidateDepartments,
} from './departments'
export type { Department } from './departments'

// Regions
export {
  regionEntity,
  useRegions,
  useRegionsSlim,
  useRegion,
  useRegionsPaginated,
  useRegionDictionary,
  createRegion,
  updateRegion,
  deleteRegion,
  invalidateRegions,
} from './regions'

// Cities
export {
  cityEntity,
  useCities,
  useCitiesSlim,
  useCity,
  useCitiesPaginated,
  useCityDictionary,
  createCity,
  updateCity,
  deleteCity,
  invalidateCities,
} from './cities'
export type { City } from '@/stores/region-store'

// Attractions
export {
  attractionEntity,
  useAttractions,
  useAttractionsSlim,
  useAttraction,
  useAttractionsPaginated,
  useAttractionDictionary,
  createAttraction,
  updateAttraction,
  deleteAttraction,
  invalidateAttractions,
} from './attractions'

// Hotels
export {
  hotelEntity,
  useHotels,
  useHotel,
  useHotelsPaginated,
  createHotel,
  updateHotel,
  deleteHotel,
  invalidateHotels,
} from './hotels'

// Restaurants
export {
  restaurantEntity,
  useRestaurants,
  useRestaurant,
  useRestaurantsPaginated,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  invalidateRestaurants,
} from './restaurants'

// ============================================
// 公司客戶
// ============================================

// Companies
export {
  companyEntity,
  useCompanies,
  useCompaniesSlim,
  useCompany,
  useCompaniesPaginated,
  useCompanyDictionary,
  createCompany,
  updateCompany,
  deleteCompany,
  invalidateCompanies,
} from './companies'

// Company Contacts
export {
  companyContactEntity,
  useCompanyContacts,
  useCompanyContactsSlim,
  useCompanyContact,
  useCompanyContactsPaginated,
  useCompanyContactDictionary,
  createCompanyContact,
  updateCompanyContact,
  deleteCompanyContact,
  invalidateCompanyContacts,
} from './company-contacts'

// ============================================
// 車隊管理
// ============================================

// Fleet Vehicles
export {
  fleetVehicleEntity,
  useFleetVehicles,
  useFleetVehiclesSlim,
  useFleetVehicle,
  useFleetVehiclesPaginated,
  useFleetVehicleDictionary,
  createFleetVehicle,
  updateFleetVehicle,
  deleteFleetVehicle,
  invalidateFleetVehicles,
} from './fleet-vehicles'

// Fleet Drivers
export {
  fleetDriverEntity,
  useFleetDrivers,
  useFleetDriversSlim,
  useFleetDriver,
  useFleetDriversPaginated,
  useFleetDriverDictionary,
  createFleetDriver,
  updateFleetDriver,
  deleteFleetDriver,
  invalidateFleetDrivers,
} from './fleet-drivers'

// Fleet Schedules
export {
  fleetScheduleEntity,
  useFleetSchedules,
  useFleetSchedulesSlim,
  useFleetSchedule,
  useFleetSchedulesPaginated,
  useFleetScheduleDictionary,
  createFleetSchedule,
  updateFleetSchedule,
  deleteFleetSchedule,
  invalidateFleetSchedules,
} from './fleet-schedules'

// ============================================
// 領隊管理
// ============================================

// Tour Leaders
export {
  tourLeaderEntity,
  useTourLeaders,
  useTourLeadersSlim,
  useTourLeader,
  useTourLeadersPaginated,
  useTourLeaderDictionary,
  createTourLeader,
  updateTourLeader,
  deleteTourLeader,
  invalidateTourLeaders,
} from './tour-leaders'

// Leader Schedules
export {
  leaderScheduleEntity,
  useLeaderSchedules,
  useLeaderSchedulesSlim,
  useLeaderSchedule,
  useLeaderSchedulesPaginated,
  useLeaderScheduleDictionary,
  createLeaderSchedule,
  updateLeaderSchedule,
  deleteLeaderSchedule,
  invalidateLeaderSchedules,
} from './leader-schedules'

// ============================================
// 行事曆與加購
// ============================================

// Calendar Events
export {
  calendarEventEntity,
  useCalendarEvents,
  useCalendarEventsSlim,
  useCalendarEvent,
  useCalendarEventsPaginated,
  useCalendarEventDictionary,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  invalidateCalendarEvents,
} from './calendar-events'

// Tour Add-Ons - 已停用，資料表不存在
// export {
//   tourAddOnEntity,
//   useTourAddOns,
//   useTourAddOnsSlim,
//   useTourAddOn,
//   useTourAddOnsPaginated,
//   useTourAddOnDictionary,
//   createTourAddOn,
//   updateTourAddOn,
//   deleteTourAddOn,
//   invalidateTourAddOns,
// } from './tour-addons'

// ============================================
// 代辦費用
// ============================================

// Vendor Costs
export {
  vendorCostEntity,
  useVendorCosts,
  useVendorCostsSlim,
  useVendorCost,
  useVendorCostsPaginated,
  useVendorCostDictionary,
  createVendorCost,
  updateVendorCost,
  deleteVendorCost,
  invalidateVendorCosts,
} from './vendor-costs'

// Payment Request Items
export {
  paymentRequestItemEntity,
  usePaymentRequestItems,
  usePaymentRequestItemsSlim,
  usePaymentRequestItem,
  usePaymentRequestItemsPaginated,
  usePaymentRequestItemDictionary,
  createPaymentRequestItem,
  updatePaymentRequestItem,
  deletePaymentRequestItem,
  invalidatePaymentRequestItems,
} from './payment-request-items'

// LinkPay Logs
export {
  linkPayLogEntity,
  useLinkPayLogs,
  useLinkPayLogsSlim,
  useLinkPayLog,
  useLinkPayLogsPaginated,
  useLinkPayLogDictionary,
  createLinkPayLog,
  updateLinkPayLog,
  deleteLinkPayLog,
  invalidateLinkPayLogs,
} from './linkpay-logs'

// ============================================
// eSIM 網卡
// ============================================

// Esims
export {
  esimEntity,
  useEsims,
  useEsimsSlim,
  useEsim,
  useEsimsPaginated,
  useEsimDictionary,
  createEsim,
  updateEsim,
  deleteEsim,
  invalidateEsims,
} from './esims'

// ============================================
// 確認單
// ============================================

// Confirmations
export {
  confirmationEntity,
  useConfirmations,
  useConfirmationsSlim,
  useConfirmation,
  useConfirmationsPaginated,
  useConfirmationDictionary,
  createConfirmation,
  updateConfirmation,
  deleteConfirmation,
  invalidateConfirmations,
} from './confirmations'

// ============================================
// 成本模板
// ============================================

// Cost Templates
export {
  costTemplateEntity,
  useCostTemplates,
  useCostTemplatesSlim,
  useCostTemplate,
  useCostTemplatesPaginated,
  useCostTemplateDictionary,
  createCostTemplate,
  updateCostTemplate,
  deleteCostTemplate,
  invalidateCostTemplates,
} from './cost-templates'

// ============================================
// 供應商類別
// ============================================

// Supplier Categories
export {
  supplierCategoryEntity,
  useSupplierCategories,
  useSupplierCategoriesSlim,
  useSupplierCategory,
  useSupplierCategoriesPaginated,
  useSupplierCategoryDictionary,
  createSupplierCategory,
  updateSupplierCategory,
  deleteSupplierCategory,
  invalidateSupplierCategories,
} from './supplier-categories'

// ============================================
// PNR 訂位記錄
// ============================================

// PNRs
export {
  pnrEntity,
  usePNRs,
  usePNRsSlim,
  usePNR,
  usePNRsPaginated,
  usePNRDictionary,
  createPNR,
  updatePNR,
  deletePNR,
  invalidatePNRs,
} from './pnrs'

// ============================================
// 報價單項目
// ============================================

// Quote Items
export {
  quoteItemEntity,
  useQuoteItems,
  useQuoteItemsSlim,
  useQuoteItem,
  useQuoteItemsPaginated,
  useQuoteItemDictionary,
  createQuoteItem,
  updateQuoteItem,
  deleteQuoteItem,
  invalidateQuoteItems,
} from './quote-items'

// Company Assets
export * from './company-assets'

// Notes
export * from './notes'

// Channel Members
export * from './channel-members'

// Tour Requests
export * from './tour-requests'

// Image Library
export * from './image-library'

// Tour Bonus Settings
export * from './tour-bonus-settings'

// Workspace Bonus Defaults
export * from './workspace-bonus-defaults'

// ============================================
// 核心表（行程項目生命週期）
// ============================================

// Tour Itinerary Items
export {
  tourItineraryItemEntity,
  useTourItineraryItems,
  useTourItineraryItemsSlim,
  useTourItineraryItem,
  useTourItineraryItemsPaginated,
  useTourItineraryItemDictionary,
  createTourItineraryItem,
  updateTourItineraryItem,
  deleteTourItineraryItem,
  invalidateTourItineraryItems,
} from './tour-itinerary-items'
