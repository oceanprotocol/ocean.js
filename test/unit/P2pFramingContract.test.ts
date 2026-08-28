import { expect } from 'chai'
import {
  LP_MAX_BUFFER_BYTES,
  LP_MAX_FRAME_BYTES,
  LP_MAX_LENGTH_PREFIX_BYTES,
  LP_PAUSE_BUFFER_BYTES,
  LP_RESUME_BELOW_BYTES
} from '../../src/services/providers/lpFraming.js'

/**
 * The framing constants are a **cross-repository contract**, not a local tuning choice.
 * ocean-node's `src/components/P2P/lpFraming.ts` declares the same five values, and the
 * two must agree byte for byte: a peer that declares a frame larger than the other side's
 * `maxDataLength` is rejected outright, and a read buffer smaller than the window the
 * muxer grows to is what silently discards a large body mid-transfer.
 *
 * The relationships between them are checked elsewhere, and would still hold if both
 * repos moved a value — in *different* directions. So the absolute numbers are pinned
 * here as literals. Changing one is a deliberate act that fails this test, and the fix is
 * to change ocean-node's module in the same commit, not to update the number here.
 */
describe('P2P framing constants match the other end of the protocol', () => {
  it('pins the four flow-control values and the prefix slack', () => {
    expect(LP_MAX_FRAME_BYTES, 'maxDataLength handed to lpStream').to.equal(
      4 * 1024 * 1024
    )
    expect(LP_MAX_LENGTH_PREFIX_BYTES, 'varint bytes for a max-size frame').to.equal(4)
    expect(LP_PAUSE_BUFFER_BYTES, 'stream.maxReadBufferLength while paused').to.equal(
      16 * 1024 * 1024
    )
    expect(LP_MAX_BUFFER_BYTES, 'lpStream maxBufferSize').to.equal(24 * 1024 * 1024)
  })

  it('keeps the derived resume mark consistent with what it is derived from', () => {
    // Stated as a derivation rather than a literal because that is how it is defined: a
    // paused loop can only progress by reading one whole frame out of its backlog, so the
    // mark can never sit below one maximum frame plus its prefix.
    expect(LP_RESUME_BELOW_BYTES).to.equal(
      LP_MAX_FRAME_BYTES + LP_MAX_LENGTH_PREFIX_BYTES
    )
    expect(LP_MAX_BUFFER_BYTES).to.be.at.least(
      LP_PAUSE_BUFFER_BYTES + LP_RESUME_BELOW_BYTES
    )
    expect(LP_PAUSE_BUFFER_BYTES).to.be.at.least(LP_MAX_FRAME_BYTES)
  })
})
