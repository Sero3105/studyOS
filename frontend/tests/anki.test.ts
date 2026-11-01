import { test } from 'node:test'
import assert from 'node:assert/strict'

import { ankiExport } from '../src/utils/anki.ts'

test('anki export escapes html, tabs and newlines', () => {
  const out = ankiExport([{ front: 'a < b\tc', back: 'riga 1\nriga 2 & co', tag: 'Analisi 1' }])
  assert.equal(out, '#separator:tab\n#html:true\n#tags column:3\na &lt; b c\triga 1<br>riga 2 &amp; co\tAnalisi_1\n')
})

test('cards from notes', async () => {
  const { cardsFromNotes } = await import('../src/utils/anki.ts')
  const notes = '# Limiti\n- Limite notevole sin x/x :: 1\nTesto normale\n* de l\'Hôpital ::  forme 0/0  \n::vuota'
  assert.deepEqual(cardsFromNotes(notes), [{ front: 'Limite notevole sin x/x', back: '1' }, { front: "de l'Hôpital", back: 'forme 0/0' }])
})

test('parse anki export and csv', async () => {
  const { ankiExport, parseCardFile } = await import('../src/utils/anki.ts')
  const exported = ankiExport([{ front: 'a < b', back: 'riga 1\nriga 2 & co', tag: 'x' }])
  assert.deepEqual(parseCardFile(exported), [{ front: 'a < b', back: 'riga 1\nriga 2 & co' }])
  assert.deepEqual(parseCardFile('\uFEFFDomanda;Risposta\n"Cos\'è; davvero";"Un ""test"""\nsolo fronte;\n'), [
    { front: "Cos'è; davvero", back: 'Un "test"' },
  ])
  assert.deepEqual(parseCardFile('q1,a1\nq2,a2'), [{ front: 'q1', back: 'a1' }, { front: 'q2', back: 'a2' }])
})
