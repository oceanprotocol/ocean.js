import { expect } from 'chai'
import { AGENT_SIGNATURE, OK_STATUS, createP2pTestPeer, drain } from './p2pStreamPeer.js'

/**
 * A response body larger than the read buffer used to be silently mutilated. When the
 * unread backlog passed the buffer ceiling the underlying byte stream dropped the
 * *whole* buffer, and the rejection it raised did nothing because no read was pending
 * — which is precisely the moment a consumer is busy with the chunk it was just
 * handed. The frame parser then resynchronised on payload bytes and handed out
 * corrupt, out-of-sequence frames; roughly a tenth of a large payload arrived, and it
 * arrived looking like a success.
 *
 * Four limits now cooperate to prevent that: an explicit read-buffer ceiling, a raised
 * transport pause buffer, reads paused while the consumer works, and a resume mark
 * that keeps a fallen-behind loop draining what it already holds. This exercises them
 * end to end over a real `streamPair`, with the consumer deliberately slower than the
 * producer.
 */
describe('P2P response body larger than the read buffer', () => {
  const FRAME_BYTES = 64 * 1024
  /**
   * 5 MiB in 64 KiB frames. The discard fired when the unread backlog passed the old
   * 4 MiB read-buffer default, so a body at or under 4 MiB cannot reproduce it at all;
   * 80 frames is the smallest round count that clears the threshold with enough margin
   * that the frames the consumer has already drained cannot drop the backlog back under
   * it. 64 KiB is the high-water mark a node's own file reads arrive at.
   */
  const FRAME_COUNT = 80

  function stampedFrame(index: number): Uint8Array {
    const bytes = new Uint8Array(FRAME_BYTES)
    const view = new DataView(bytes.buffer)
    view.setUint32(0, index, false)
    bytes.fill((index % 251) + 1, 4, FRAME_BYTES - 4)
    view.setUint32(FRAME_BYTES - 4, index, false)
    return bytes
  }

  function readStamps(frame: Uint8Array): { head: number; tail: number } {
    const view = new DataView(frame.buffer, frame.byteOffset, frame.byteLength)
    return {
      head: view.getUint32(0, false),
      tail: view.getUint32(frame.byteLength - 4, false)
    }
  }

  it('delivers every frame complete and in order to a consumer slower than the peer', async () => {
    const peer = await createP2pTestPeer()
    const produced = (async () => {
      await peer.commandReceived
      peer.sendFrame(OK_STATUS)
      // Pushed without waiting for the transport to drain, which is the condition the
      // discard needed: a peer that produces faster than the consumer reads.
      for (let index = 0; index < FRAME_COUNT; index++) {
        peer.sendFrame(stampedFrame(index))
      }
      await peer.close()
    })()

    const body = await peer.provider.getComputeResult(
      'test-peer',
      AGENT_SIGNATURE,
      'job-1',
      0
    )
    // A couple of milliseconds per frame keeps the consumer behind the producer for the
    // whole transfer, which is the only condition under which a backlog builds at all.
    const frames = await drain(body as AsyncIterable<Uint8Array>, 2)
    await produced

    expect(frames).to.have.lengthOf(FRAME_COUNT)
    const wrongSize = frames.filter((frame) => frame.byteLength !== FRAME_BYTES)
    expect(
      wrongSize,
      `${wrongSize.length} frames were not ${FRAME_BYTES} bytes`
    ).to.have.lengthOf(0)
    const outOfOrder = frames
      .map((frame, position) => ({ position, ...readStamps(frame) }))
      .filter((stamp) => stamp.head !== stamp.position || stamp.tail !== stamp.position)
    expect(
      outOfOrder,
      `frames out of sequence: ${JSON.stringify(outOfOrder.slice(0, 3))}`
    ).to.have.lengthOf(0)

    const totalBytes = frames.reduce((sum, frame) => sum + frame.byteLength, 0)
    expect(totalBytes).to.equal(FRAME_BYTES * FRAME_COUNT)
  }).timeout(60_000)

  /**
   * The ceiling alone is not enough once a transfer is bigger than the ceiling itself.
   * Here the peer respects the transport's own drain signal, so the only thing that can
   * stop it outrunning the consumer is the read loop pausing the transport between
   * frames — and the raised pause buffer is what lets a paused stream hold the bytes
   * that were already in flight instead of resetting on them.
   */
  const LARGE_FRAME_COUNT = 640

  it('holds the transport back rather than overflowing on a body far larger than the buffer', async () => {
    const peer = await createP2pTestPeer()
    const produced = (async () => {
      await peer.commandReceived
      await peer.writeFrame(OK_STATUS)
      for (let index = 0; index < LARGE_FRAME_COUNT; index++) {
        await peer.writeFrame(stampedFrame(index))
      }
      await peer.close()
    })()

    const body = await peer.provider.getComputeResult(
      'test-peer',
      AGENT_SIGNATURE,
      'job-1',
      0
    )
    const frames = await drain(body as AsyncIterable<Uint8Array>, 1)
    await produced

    expect(frames).to.have.lengthOf(LARGE_FRAME_COUNT)
    const damaged = frames
      .map((frame, position) => ({
        position,
        size: frame.byteLength,
        ...readStamps(frame)
      }))
      .filter(
        (stamp) =>
          stamp.size !== FRAME_BYTES ||
          stamp.head !== stamp.position ||
          stamp.tail !== stamp.position
      )
    expect(
      damaged,
      `${damaged.length} damaged frames, first: ${JSON.stringify(damaged[0])}`
    ).to.have.lengthOf(0)
  }).timeout(120_000)
})
