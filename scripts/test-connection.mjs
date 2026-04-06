import pg from 'pg'
const { Client } = pg

// 嘗試不同的連接方式
const configs = [
  {
    name: 'Direct Connection',
    config: {
      host: 'db.pfqvdacxowpgfamuvnsn.supabase.co',
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: 'kbJdYHtXOWudBGzV3Jv5OWzWQQZT4aBFFgfUczaVdIE',
      ssl: { rejectUnauthorized: false },
    },
  },
  {
    name: 'Pooler Connection',
    config: {
      host: 'aws-0-ap-southeast-1.pooler.supabase.com',
      port: 6543,
      database: 'postgres',
      user: 'postgres.pfqvdacxowpgfamuvnsn',
      password: 'kbJdYHtXOWudBGzV3Jv5OWzWQQZT4aBFFgfUczaVdIE',
      ssl: { rejectUnauthorized: false },
    },
  },
]

for (const { name, config } of configs) {
  console.log(`\n測試 ${name}...`)
  const client = new Client(config)

  try {
    await client.connect()
    console.log(`✅ ${name} 連接成功！`)

    const result = await client.query('SELECT version()')
    const versionStr = result.rows[0].version
    console.log(`PostgreSQL 版本: ${versionStr.substring(0, 50)}...`)

    await client.end()

    // 如果成功，輸出連接字串格式
    console.log(`\n✅ 使用這個配置！`)
    console.log('Host:', config.host)
    console.log('Port:', config.port)
    console.log('User:', config.user)
    process.exit(0)
  } catch (error) {
    console.log(`❌ ${name} 失敗: ${error.message}`)
    try {
      await client.end()
    } catch {}
  }
}

console.log('\n❌ 所有連接方式都失敗了')
process.exit(1)
