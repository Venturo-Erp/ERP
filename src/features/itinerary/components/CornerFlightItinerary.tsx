'use client'
/**
 * Corner 風格機票行程單組件
 * 用於生成機票行程單 PDF
 */

import React from 'react'
import { COMPANY_NAME, COMPANY_NAME_EN } from '@/lib/tenant'

// Corner 品牌色系
const CORNER_COLORS = {
  orange: '#F89A1E', // Corner 橘色
  gold: '#B8A99A', // 金色（次要）
  brown: '#3a3633', // 深棕色
  lightBrown: '#FAF7F2', // 淺棕背景
  gray: '#4B5563',
  lightGray: '#9CA3AF',
  border: '#E5E7EB',
}

interface FlightSegment {
  departure_airport: string
  departure_terminal?: string
  departure_datetime: string
  arrival_airport: string
  arrival_terminal?: string
  arrival_datetime: string
  airline: string
  flight_number: string
  cabin_class: string
  booking_reference: string
  eticket_number?: string
}

interface BaggageAllowance {
  personal_item: string
  carry_on: string
  checked: string
}

interface FlightItineraryData {
  order_number: string
  passenger_name: string
  outbound_flight: FlightSegment
  return_flight: FlightSegment
  outbound_baggage: BaggageAllowance
  return_baggage: BaggageAllowance
}

interface CornerFlightItineraryProps {
  data: FlightItineraryData
  language?: 'zh' | 'en'
  companyName?: string
}

export const CornerFlightItinerary: React.FC<CornerFlightItineraryProps> = ({
  data,
  language = 'zh',
  companyName,
}) => {
  const displayCompany = companyName || ''

  const labels = {
    zh: {
      title: '機票行程單',
      subtitle: 'FLIGHT ITINERARY',
      orderNumber: '訂單編號：',
      passengerName: '旅客姓名：',
      bookingInfo: '預訂資訊',
      flightInfo: '航班資訊',
      baggageInfo: '行李限額',
      outbound: '去程',
      return: '回程',
      departure: '出發',
      arrival: '抵達',
      airline: '航空公司',
      flightNumber: '航班號碼',
      cabinClass: '艙等',
      bookingRef: '預訂參考編號',
      eticket: '電子機票號碼',
      personalItem: '隨身物品',
      carryOn: '手提行李',
      checked: '托運行李',
      slogan: '如果可以，讓我們一起探索世界的每個角落',
    },
    en: {
      title: 'Flight Itinerary',
      subtitle: 'FLIGHT ITINERARY',
      orderNumber: 'Order Number:',
      passengerName: 'Passenger Name:',
      bookingInfo: 'Booking Information',
      flightInfo: 'Flight Information',
      baggageInfo: 'Baggage Allowance',
      outbound: 'Outbound',
      return: 'Return',
      departure: 'Departure',
      arrival: 'Arrival',
      airline: 'Airline',
      flightNumber: 'Flight No.',
      cabinClass: 'Class',
      bookingRef: 'Booking Reference',
      eticket: 'E-ticket No.',
      personalItem: 'Personal item',
      carryOn: 'Carry-on baggage',
      checked: 'Checked baggage',
      slogan: '如果可以，讓我們一起探索世界的每個角落',
    },
  }

  const t = labels[language]

  return (
    <div
      style={{
        padding: '0',
        backgroundColor: 'white',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft JhengHei", sans-serif',
        fontSize: '11pt',
        color: CORNER_COLORS.gray,
        lineHeight: 1.6,
      }}
    >
      {/* 頁首 - Corner Logo + 標題 */}
      <div
        style={{
          borderBottom: `2px solid ${CORNER_COLORS.orange}`,
          paddingBottom: '12px',
          marginBottom: '20px',
          position: 'relative',
        }}
      >
        {/* Logo - 左上角 */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
          }}
        >
          <img
            src="/corner-logo.png"
            alt={COMPANY_NAME_EN}
            style={{
              height: '35px',
              width: 'auto',
            }}
          />
        </div>

        {/* 標題 - 右側 */}
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontSize: '18pt',
              fontWeight: 'bold',
              color: CORNER_COLORS.brown,
              marginBottom: '4px',
            }}
          >
            {t.title}
          </div>
          <div
            style={{
              fontSize: '9pt',
              color: CORNER_COLORS.lightGray,
              letterSpacing: '2px',
            }}
          >
            {t.subtitle}
          </div>
        </div>
      </div>

      {/* 基本資訊 */}
      <div
        style={{
          backgroundColor: CORNER_COLORS.lightBrown,
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          borderLeft: `4px solid ${CORNER_COLORS.orange}`,
        }}
      >
        <div style={{ marginBottom: '6px' }}>
          <span style={{ color: CORNER_COLORS.brown, fontWeight: '600' }}>{t.orderNumber}</span>
          <span style={{ color: CORNER_COLORS.orange, fontWeight: 'bold', fontSize: '11pt' }}>
            {data.order_number}
          </span>
        </div>
        <div>
          <span style={{ color: CORNER_COLORS.brown, fontWeight: '600' }}>{t.passengerName}</span>
          <span style={{ fontWeight: 'bold' }}>{data.passenger_name}</span>
        </div>
      </div>

      {/* 去程航班 */}
      <div
        style={{
          marginBottom: '24px',
        }}
      >
        <h3
          style={{
            margin: '0 0 12px 0',
            fontSize: '13pt',
            fontWeight: 'bold',
            color: CORNER_COLORS.brown,
            borderBottom: `2px solid ${CORNER_COLORS.orange}`,
            paddingBottom: '8px',
          }}
        >
          ✈️ {t.outbound}
        </h3>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            marginBottom: '12px',
          }}
        >
          {/* 出發 */}
          <div
            style={{
              padding: '12px',
              backgroundColor: CORNER_COLORS.lightBrown,
              borderRadius: '8px',
            }}
          >
            <div
              style={{
                fontSize: '9pt',
                color: CORNER_COLORS.lightGray,
                marginBottom: '4px',
                fontWeight: '600',
              }}
            >
              {t.departure}
            </div>
            <div style={{ fontSize: '12pt', fontWeight: 'bold', color: CORNER_COLORS.orange }}>
              {data.outbound_flight.departure_datetime}
            </div>
            <div style={{ fontSize: '10pt', color: CORNER_COLORS.gray, marginTop: '4px' }}>
              {data.outbound_flight.departure_airport}
              {data.outbound_flight.departure_terminal &&
                ` ${data.outbound_flight.departure_terminal}`}
            </div>
          </div>

          {/* 抵達 */}
          <div
            style={{
              padding: '12px',
              backgroundColor: CORNER_COLORS.lightBrown,
              borderRadius: '8px',
            }}
          >
            <div
              style={{
                fontSize: '9pt',
                color: CORNER_COLORS.lightGray,
                marginBottom: '4px',
                fontWeight: '600',
              }}
            >
              {t.arrival}
            </div>
            <div style={{ fontSize: '12pt', fontWeight: 'bold', color: CORNER_COLORS.orange }}>
              {data.outbound_flight.arrival_datetime}
            </div>
            <div style={{ fontSize: '10pt', color: CORNER_COLORS.gray, marginTop: '4px' }}>
              {data.outbound_flight.arrival_airport}
              {data.outbound_flight.arrival_terminal && ` ${data.outbound_flight.arrival_terminal}`}
            </div>
          </div>
        </div>

        {/* 去程行李 */}
        <div
          style={{
            padding: '10px 16px',
            backgroundColor: CORNER_COLORS.lightBrown,
            borderRadius: '8px',
            display: 'flex',
            gap: '24px',
            flexWrap: 'wrap',
            fontSize: '9pt',
          }}
        >
          <span style={{ color: CORNER_COLORS.orange, fontWeight: '700' }}>🧳 {t.baggageInfo}</span>
          <span>
            <span style={{ color: CORNER_COLORS.brown, fontWeight: '600' }}>
              {t.personalItem}：
            </span>
            {data.outbound_baggage.personal_item}
          </span>
          <span>
            <span style={{ color: CORNER_COLORS.brown, fontWeight: '600' }}>{t.carryOn}：</span>
            {data.outbound_baggage.carry_on}
          </span>
          <span>
            <span style={{ color: CORNER_COLORS.brown, fontWeight: '600' }}>{t.checked}：</span>
            {data.outbound_baggage.checked}
          </span>
        </div>

        {/* 航班詳情 */}
        <div
          style={{
            padding: '12px 16px',
            border: `1px solid ${CORNER_COLORS.border}`,
            borderRadius: '8px',
          }}
        >
          <div style={{ marginBottom: '6px' }}>
            <span style={{ color: CORNER_COLORS.brown, fontWeight: '600' }}>{t.airline}：</span>
            <span>
              {data.outbound_flight.airline} {data.outbound_flight.flight_number}
            </span>
          </div>
          <div style={{ marginBottom: '6px' }}>
            <span style={{ color: CORNER_COLORS.brown, fontWeight: '600' }}>{t.cabinClass}：</span>
            <span>{data.outbound_flight.cabin_class}</span>
          </div>
          <div style={{ marginBottom: '6px' }}>
            <span style={{ color: CORNER_COLORS.brown, fontWeight: '600' }}>{t.bookingRef}：</span>
            <span>{data.outbound_flight.booking_reference}</span>
          </div>
          {data.outbound_flight.eticket_number && (
            <div>
              <span style={{ color: CORNER_COLORS.brown, fontWeight: '600' }}>{t.eticket}：</span>
              <span>{data.outbound_flight.eticket_number}</span>
            </div>
          )}
        </div>
      </div>

      {/* 回程航班 */}
      <div
        style={{
          marginBottom: '24px',
        }}
      >
        <h3
          style={{
            margin: '0 0 12px 0',
            fontSize: '13pt',
            fontWeight: 'bold',
            color: CORNER_COLORS.brown,
            borderBottom: `2px solid ${CORNER_COLORS.orange}`,
            paddingBottom: '8px',
          }}
        >
          ✈️ {t.return}
        </h3>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            marginBottom: '12px',
          }}
        >
          {/* 出發 */}
          <div
            style={{
              padding: '12px',
              backgroundColor: CORNER_COLORS.lightBrown,
              borderRadius: '8px',
            }}
          >
            <div
              style={{
                fontSize: '9pt',
                color: CORNER_COLORS.lightGray,
                marginBottom: '4px',
                fontWeight: '600',
              }}
            >
              {t.departure}
            </div>
            <div style={{ fontSize: '12pt', fontWeight: 'bold', color: CORNER_COLORS.orange }}>
              {data.return_flight.departure_datetime}
            </div>
            <div style={{ fontSize: '10pt', color: CORNER_COLORS.gray, marginTop: '4px' }}>
              {data.return_flight.departure_airport}
              {data.return_flight.departure_terminal && ` ${data.return_flight.departure_terminal}`}
            </div>
          </div>

          {/* 抵達 */}
          <div
            style={{
              padding: '12px',
              backgroundColor: CORNER_COLORS.lightBrown,
              borderRadius: '8px',
            }}
          >
            <div
              style={{
                fontSize: '9pt',
                color: CORNER_COLORS.lightGray,
                marginBottom: '4px',
                fontWeight: '600',
              }}
            >
              {t.arrival}
            </div>
            <div style={{ fontSize: '12pt', fontWeight: 'bold', color: CORNER_COLORS.orange }}>
              {data.return_flight.arrival_datetime}
            </div>
            <div style={{ fontSize: '10pt', color: CORNER_COLORS.gray, marginTop: '4px' }}>
              {data.return_flight.arrival_airport}
              {data.return_flight.arrival_terminal && ` ${data.return_flight.arrival_terminal}`}
            </div>
          </div>
        </div>

        {/* 回程行李 */}
        <div
          style={{
            padding: '10px 16px',
            backgroundColor: CORNER_COLORS.lightBrown,
            borderRadius: '8px',
            display: 'flex',
            gap: '24px',
            flexWrap: 'wrap',
            fontSize: '9pt',
          }}
        >
          <span style={{ color: CORNER_COLORS.orange, fontWeight: '700' }}>🧳 {t.baggageInfo}</span>
          <span>
            <span style={{ color: CORNER_COLORS.brown, fontWeight: '600' }}>
              {t.personalItem}：
            </span>
            {data.return_baggage.personal_item}
          </span>
          <span>
            <span style={{ color: CORNER_COLORS.brown, fontWeight: '600' }}>{t.carryOn}：</span>
            {data.return_baggage.carry_on}
          </span>
          <span>
            <span style={{ color: CORNER_COLORS.brown, fontWeight: '600' }}>{t.checked}：</span>
            {data.return_baggage.checked}
          </span>
        </div>

        {/* 航班詳情 */}
        <div
          style={{
            padding: '12px 16px',
            border: `1px solid ${CORNER_COLORS.border}`,
            borderRadius: '8px',
          }}
        >
          <div style={{ marginBottom: '6px' }}>
            <span style={{ color: CORNER_COLORS.brown, fontWeight: '600' }}>{t.airline}：</span>
            <span>
              {data.return_flight.airline} {data.return_flight.flight_number}
            </span>
          </div>
          <div style={{ marginBottom: '6px' }}>
            <span style={{ color: CORNER_COLORS.brown, fontWeight: '600' }}>{t.cabinClass}：</span>
            <span>{data.return_flight.cabin_class}</span>
          </div>
          <div style={{ marginBottom: '6px' }}>
            <span style={{ color: CORNER_COLORS.brown, fontWeight: '600' }}>{t.bookingRef}：</span>
            <span>{data.return_flight.booking_reference}</span>
          </div>
          {data.return_flight.eticket_number && (
            <div>
              <span style={{ color: CORNER_COLORS.brown, fontWeight: '600' }}>{t.eticket}：</span>
              <span>{data.return_flight.eticket_number}</span>
            </div>
          )}
        </div>
      </div>

      {/* 頁尾 - Corner 資訊 */}
      <div
        style={{
          marginTop: '40px',
          paddingTop: '16px',
          borderTop: `1px solid ${CORNER_COLORS.border}`,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: '9pt',
            color: CORNER_COLORS.gray,
            fontStyle: 'italic',
            marginBottom: '12px',
          }}
        >
          {t.slogan}
        </div>
        <div
          style={{
            fontSize: '8pt',
            color: CORNER_COLORS.lightGray,
          }}
        >
          {displayCompany} © {new Date().getFullYear()}
        </div>
      </div>
    </div>
  )
}

export default CornerFlightItinerary
