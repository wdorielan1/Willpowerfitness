import { Avatar, Sheet } from './components'

export interface LikerRow { userId: string; name: string; avatar?: string | null }

/** The people who liked something. People who left the crew show as "Former member". */
export function LikersList({ people }: { people: LikerRow[] | null }) {
  return (
    <>
      {people === null && <p className="small mute">Loading…</p>}
      {people?.length === 0 && <p className="small mute">No likes yet.</p>}
      <div className="likers">
        {people?.map((p) => (
          <div key={p.userId} className="liker">
            <Avatar name={p.name} url={p.avatar} />
            <b>{p.name === 'Former member' ? p.name : p.name.split(' ')[0]}</b>
          </div>
        ))}
      </div>
    </>
  )
}

/** "Liked by" popup for a post or a comment. */
export function LikersSheet({ title = 'Liked by', people, onClose, z }: { title?: string; people: LikerRow[] | null; onClose: () => void; z?: number }) {
  return (
    <Sheet title={title} onClose={onClose} z={z}>
      <LikersList people={people} />
    </Sheet>
  )
}
