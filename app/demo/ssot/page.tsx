'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const TRADITIONAL_STEPS = [
  { name: '行程表', delay: 0 },
  { name: '報價單', delay: 300 },
  { name: '需求單', delay: 600 },
  { name: '結團通知', delay: 900 },
  { name: 'Email 通知', delay: 1200 },
  { name: 'LINE 訊息', delay: 1500 },
  { name: '客戶確認', delay: 1800 },
  { name: '供應商通知', delay: 2100 },
  { name: '財務更新', delay: 2400 },
  { name: '庫存調整', delay: 2700 },
]

const VENTURO_STEPS = [
  { name: '行程表', delay: 0 },
  { name: '報價單', delay: 100 },
  { name: '需求單', delay: 200 },
  { name: '結團通知', delay: 300 },
  { name: 'Email 通知', delay: 400 },
  { name: 'LINE 訊息', delay: 500 },
  { name: '客戶確認', delay: 600 },
  { name: '供應商通知', delay: 700 },
  { name: '財務更新', delay: 800 },
  { name: '庫存調整', delay: 900 },
]

export default function SSOTDemo() {
  const [isRunning, setIsRunning] = useState(false)
  const [traditionalProgress, setTraditionalProgress] = useState<number[]>([])
  const [venturoProgress, setVenturoProgress] = useState<number[]>([])
  const [traditionalTime, setTraditionalTime] = useState(0)
  const [venturoTime, setVenturoTime] = useState(0)

  const runDemo = () => {
    setIsRunning(true)
    setTraditionalProgress([])
    setVenturoProgress([])
    setTraditionalTime(0)
    setVenturoTime(0)

    // Traditional way - slow
    TRADITIONAL_STEPS.forEach((step, index) => {
      setTimeout(() => {
        setTraditionalProgress(prev => [...prev, index])
      }, step.delay)
    })

    // Venturo way - fast
    VENTURO_STEPS.forEach((step, index) => {
      setTimeout(() => {
        setVenturoProgress(prev => [...prev, index])
      }, step.delay)
    })

    // Timer for traditional
    const traditionalTimer = setInterval(() => {
      setTraditionalTime(prev => {
        if (prev >= 25) {
          clearInterval(traditionalTimer)
          return 25
        }
        return prev + 1
      })
    }, 100)

    // Timer for Venturo
    const venturoTimer = setInterval(() => {
      setVenturoTime(prev => {
        if (prev >= 3) {
          clearInterval(venturoTimer)
          return 3
        }
        return prev + 0.1
      })
    }, 100)

    // Reset after demo
    setTimeout(() => {
      setIsRunning(false)
    }, 4000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-8">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-12 text-center">
        <motion.h1 
          className="text-5xl md:text-7xl font-bold mb-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          還在複製貼上？
        </motion.h1>
        <motion.p 
          className="text-2xl md:text-3xl text-purple-300"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          你的時間不值錢嗎？
        </motion.p>
      </div>

      {/* Main Demo */}
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Traditional Way */}
          <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-8 border border-red-500/30">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-red-400">😰 傳統方式</h2>
              <div className="text-3xl font-mono text-red-400">
                {traditionalTime.toFixed(0)} 分鐘
              </div>
            </div>

            <div className="space-y-3">
              {TRADITIONAL_STEPS.map((step, index) => (
                <motion.div
                  key={index}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    traditionalProgress.includes(index)
                      ? 'bg-red-500/20 border border-red-500'
                      : 'bg-slate-700/30 border border-slate-600'
                  }`}
                  initial={{ opacity: 0.3 }}
                  animate={{ 
                    opacity: traditionalProgress.includes(index) ? 1 : 0.3,
                    scale: traditionalProgress.includes(index) ? 1.02 : 1
                  }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="text-2xl">
                    {traditionalProgress.includes(index) ? '❌' : '⏳'}
                  </div>
                  <div>{step.name}</div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Venturo Way */}
          <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-8 border border-green-500/30">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-green-400">✨ Venturo ERP</h2>
              <div className="text-3xl font-mono text-green-400">
                {venturoTime.toFixed(1)} 秒
              </div>
            </div>

            <div className="space-y-3">
              {VENTURO_STEPS.map((step, index) => (
                <motion.div
                  key={index}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    venturoProgress.includes(index)
                      ? 'bg-green-500/20 border border-green-500'
                      : 'bg-slate-700/30 border border-slate-600'
                  }`}
                  initial={{ opacity: 0.3 }}
                  animate={{ 
                    opacity: venturoProgress.includes(index) ? 1 : 0.3,
                    scale: venturoProgress.includes(index) ? 1.02 : 1
                  }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="text-2xl">
                    {venturoProgress.includes(index) ? '✅' : '⏳'}
                  </div>
                  <div>{step.name}</div>
                  {index === 0 && venturoProgress.includes(0) && (
                    <motion.div
                      className="ml-auto text-xs text-green-400"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      自動同步中...
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <div className="text-center">
          <motion.button
            onClick={runDemo}
            disabled={isRunning}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-slate-600 disabled:to-slate-700 text-white font-bold py-6 px-12 rounded-full text-2xl shadow-2xl transform transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {isRunning ? '展示中...' : '👆 點我看魔術'}
          </motion.button>

          <motion.p 
            className="mt-6 text-slate-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            情境：客戶要把「契迪龍寺」換成「雙龍寺」
          </motion.p>
        </div>

        {/* Stats */}
        <AnimatePresence>
          {traditionalProgress.length === TRADITIONAL_STEPS.length && (
            <motion.div
              className="mt-16 bg-gradient-to-r from-purple-800/30 to-pink-800/30 backdrop-blur rounded-2xl p-8 border border-purple-500/30"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <h3 className="text-3xl font-bold mb-6 text-center">你的時間值多少錢？</h3>
              
              <div className="grid md:grid-cols-3 gap-6 text-center">
                <div>
                  <div className="text-5xl font-bold text-purple-400 mb-2">4 小時</div>
                  <div className="text-slate-300">每天浪費的時間</div>
                  <div className="text-sm text-slate-400 mt-2">25 分鐘 × 10 個修改</div>
                </div>

                <div>
                  <div className="text-5xl font-bold text-green-400 mb-2">120 小時</div>
                  <div className="text-slate-300">一個月省下的時間</div>
                  <div className="text-sm text-slate-400 mt-2">等於 3 個員工的產值</div>
                </div>

                <div>
                  <div className="text-5xl font-bold text-pink-400 mb-2">100%</div>
                  <div className="text-slate-300">準確率</div>
                  <div className="text-sm text-slate-400 mt-2">不會漏掉任何文件</div>
                </div>
              </div>

              <div className="mt-8 text-center">
                <motion.button
                  className="bg-white text-purple-900 font-bold py-4 px-8 rounded-full text-xl shadow-xl"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  免費試用 14 天 →
                </motion.button>
                <p className="mt-3 text-sm text-slate-400">不用信用卡，馬上體驗</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* What is SSOT */}
        <motion.div
          className="mt-16 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <h3 className="text-2xl font-bold mb-4">這就是 SSOT</h3>
          <p className="text-xl text-slate-300 mb-2">Single Source of Truth</p>
          <p className="text-lg text-slate-400">一次修改，全部同步</p>
        </motion.div>
      </div>
    </div>
  )
}
