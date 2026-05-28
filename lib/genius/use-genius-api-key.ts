
import { useEffect, useState } from 'react'
import readStoredGeniusApiKey from './read-stored-genius-api-key'
import writeStoredGeniusApiKey from './write-stored-genius-api-key'

export default function useGeniusApiKey() {
  const [storedApiKey, setStoredApiKey] = useState('')

  useEffect(() => {
    setStoredApiKey(readStoredGeniusApiKey())
  }, [])

  const writeApiKey = (apiKey: string) => {
    writeStoredGeniusApiKey(apiKey)
    setStoredApiKey(apiKey)
  }

  return { storedApiKey, writeStoredApiKey: writeApiKey }
}
