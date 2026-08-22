'use client'

export function PrintControls() {
  const share = async () => {
    if (navigator.share) {
      await navigator.share({ title: 'PurePulse Partner Flyer', url: window.location.href })
      return
    }
    await navigator.clipboard.writeText(window.location.href)
    window.alert('Flyer link copied')
  }

  return (
    <div className="no-print controls">
      <button onClick={() => window.print()}>Print or save PDF</button>
      <button className="secondary" onClick={share}>Share flyer</button>
    </div>
  )
}
