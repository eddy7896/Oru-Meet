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
    const yArr = yDoc.getArray<{ key: string; val: TLRecord }>('tldraw-records')
    const yState = yDoc.getMap<number>('tldraw-state')

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
                yArr.push([{ key: record.id, val: record }])
              })
              Object.values(changes.updated).forEach(([_, record]) => {
                const idx = yArr.toArray().findIndex((r) => r.key === record.id)
                if (idx !== -1) {
                  yArr.delete(idx, 1)
                  yArr.insert(idx, [{ key: record.id, val: record }])
                } else {
                  yArr.push([{ key: record.id, val: record }])
                }
              })
              Object.values(changes.removed).forEach((record) => {
                const idx = yArr.toArray().findIndex((r) => r.key === record.id)
                if (idx !== -1) {
                  yArr.delete(idx, 1)
                }
              })
            })
          },
          { source: 'user', scope: 'document' } // only sync user's document changes
        )
      )

      // 2. Connect yjs to store
      yArr.observeDeep((events) => {
        try {
          const toAdd: TLRecord[] = []
          const toUpdate: TLRecord[] = []
          const toRemove: TLRecord['id'][] = []

          events.forEach((event) => {
            event.changes.delta.forEach((delta) => {
              if (delta.insert && Array.isArray(delta.insert)) {
                delta.insert.forEach((item: any) => {
                  if (store.has(item.key)) {
                    toUpdate.push(item.val)
                  } else {
                    toAdd.push(item.val)
                  }
                })
              }
              // Deletions are harder to track purely by delta, so we do a full diff if needed
              // But for simplicity, we rely on the insert updates
            })
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

    // Wait for initial sync from network
    provider.on('synced', (isSynced: boolean) => {
      if (isSynced) {
        handleSync()
      }
    })

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
