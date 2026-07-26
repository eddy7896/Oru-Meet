import { useState, useEffect } from 'react'
import {
  createTLStore,
  defaultShapeUtils,
  defaultBindingUtils,
  TLAnyShapeUtilConstructor,
  TLAnyBindingUtilConstructor,
  TLRecord,
  InstancePresenceRecordType
} from 'tldraw'
import * as Y from 'yjs'
import { WebrtcProvider } from 'y-webrtc'

export function useYjsStore({
  roomId,
  hostUrl = 'wss://signaling.yjs.dev,wss://y-webrtc-signaling-eu.herokuapp.com,wss://y-webrtc-signaling-us.herokuapp.com',
  shapeUtils = [],
  bindingUtils = [],
}: {
  roomId: string
  hostUrl?: string
  shapeUtils?: TLAnyShapeUtilConstructor[]
  bindingUtils?: TLAnyBindingUtilConstructor[]
}) {
  const [store] = useState(() => {
    return createTLStore({
      shapeUtils: [...defaultShapeUtils, ...shapeUtils],
      bindingUtils: [...defaultBindingUtils, ...bindingUtils],
    })
  })

  const [storeWithStatus, setStoreWithStatus] = useState<
    | { status: 'loading' }
    | { status: 'synced'; store: typeof store }
    | { status: 'error'; error: Error }
  >({ status: 'loading' })

  useEffect(() => {
    setStoreWithStatus({ status: 'loading' })

    const yDoc = new Y.Doc({ gc: true })
    const yMap = yDoc.getMap<TLRecord>('tldraw-records')

    // Initialize WebRTC provider
    const provider = new WebrtcProvider(roomId, yDoc, {
      signaling: hostUrl.split(','),
    })

    const unsubs: (() => void)[] = []

    function handleSync() {
      // 1. Connect store to yjs
      unsubs.push(
        store.listen(
          function syncStoreChangesToYjs({ changes }) {
            yDoc.transact(() => {
              Object.values(changes.added).forEach((record) => {
                yMap.set(record.id, record)
              })
              Object.values(changes.updated).forEach(([_, record]) => {
                yMap.set(record.id, record)
              })
              Object.values(changes.removed).forEach((record) => {
                yMap.delete(record.id)
              })
            })
          },
          { source: 'user', scope: 'document' } // only sync user's document changes
        )
      )

      // 2. Connect yjs to store
      yMap.observe((event) => {
        try {
          const toAdd: TLRecord[] = []
          const toUpdate: TLRecord[] = []
          const toRemove: TLRecord['id'][] = []

          event.changes.keys.forEach((change, key) => {
            if (change.action === 'add') {
              const record = yMap.get(key)
              if (record) {
                if (store.has(record.id)) toUpdate.push(record)
                else toAdd.push(record)
              }
            } else if (change.action === 'update') {
              const record = yMap.get(key)
              if (record) toUpdate.push(record)
            } else if (change.action === 'delete') {
              toRemove.push(key as TLRecord['id'])
            }
          })

          if (toAdd.length || toUpdate.length || toRemove.length) {
            store.mergeRemoteChanges(() => {
              if (toAdd.length) store.put(toAdd)
              if (toUpdate.length) store.put(toUpdate)
              if (toRemove.length) store.remove(toRemove)
            })
          }
        } catch (e) {
          console.error(e)
        }
      })

      setStoreWithStatus({ status: 'synced', store })
    }

    // We call handleSync immediately so the user can start drawing without
    // waiting for a 'synced' event (which may never fire if they are alone in the room)
    handleSync()

    return () => {
      unsubs.forEach((fn) => fn())
      unsubs.length = 0
      provider.disconnect()
      provider.destroy()
      yDoc.destroy()
    }
  }, [roomId, store, hostUrl])

  return storeWithStatus
}
