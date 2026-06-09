function showSpeedIndicator(speed) {
	const parent = document.fullscreenElement || document.body
	let indicator = document.getElementById('yoopd-speed-indicator')

	if (!indicator || !parent.contains(indicator)) {
		if (indicator) indicator.remove()
		indicator = document.createElement('div')
		indicator.id = 'yoopd-speed-indicator'
		indicator.style.cssText = `
			position: fixed;
			top: 20px;
			right: 20px;
			background: rgba(0, 0, 0, 0.5);
			color: white;
			padding: 12px 20px;
			border-radius: 8px;
			font-size: 24px;
			font-weight: bold;
			font-family: Arial, sans-serif;
			z-index: 9999;
			transition: opacity 0.3s ease;
			pointer-events: none;
		`
		parent.appendChild(indicator)
	}

	indicator.textContent = `${speed.toFixed(2)}x`
	indicator.style.opacity = '1'

	// Clear any existing timeout
	if (indicator.hideTimeout) {
		clearTimeout(indicator.hideTimeout)
	}

	// Fade out after 1.5 seconds
	indicator.hideTimeout = setTimeout(() => {
		indicator.style.opacity = '0'
	}, 1500)
}

document.addEventListener('keydown', function(event) {
	// Ignore when modifier keys are held (e.g. Ctrl+F for browser find)
	if (event.ctrlKey || event.altKey || event.metaKey) return

	// Ignore if user is typing in an input field
	const target = event.target
	if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
		return
	}

	if (event.key === "]") {
		event.preventDefault()
		event.stopPropagation()
		event.stopImmediatePropagation()
		// find element on keypress to avoid a stale variable in youtube SPA
		const video = document.querySelector('video')
		if (video) {
			video.playbackRate += 0.25
			// Update speed in YouTube's UI
			video.dispatchEvent(new Event('ratechange'))
			showSpeedIndicator(video.playbackRate)
		}
	}
	if (event.key === '[') {
		event.preventDefault()
		event.stopPropagation()
		event.stopImmediatePropagation()
		const video = document.querySelector('video')
		if (video) {
			// avoid speed going below 0.25
			video.playbackRate = Math.max(0.25, video.playbackRate - 0.25)
			video.dispatchEvent(new Event('ratechange'))
			showSpeedIndicator(video.playbackRate)
		}
	}
	if (event.key === 'f' || event.key === 'F') {
		if (document.fullscreenElement) {
			document.exitFullscreen()
		} else {
			// Only fullscreen a video that is currently playing
			const videos = document.querySelectorAll('video')
			const playing = Array.from(videos).find(v => !v.paused)
			if (playing) {
				const container = playing.closest('[class*="player" i]') || playing
				container.requestFullscreen()
			}
		}
	}
}, true)

// --- Fallback playback hotkeys ----------------------------------------------
// Standard video controls (seek, volume, play/pause) for players that don't
// ship their own. We listen in the BUBBLE phase on window so the page's own
// handlers always run first. If the page already acted on the key (it called
// preventDefault, or stopped the event before it reached us) we leave it alone,
// so on sites that already have these shortcuts theirs win and we never double up.

// The video worth controlling: a reasonably sized, on-screen one (so we don't
// hijack page scrolling for a tiny/off-screen incidental video), preferring the
// one that's currently playing.
function getActiveVideo() {
	const videos = Array.from(document.querySelectorAll('video')).filter(v => {
		const r = v.getBoundingClientRect()
		const onScreen = r.bottom > 0 && r.right > 0 && r.top < window.innerHeight && r.left < window.innerWidth
		return onScreen && r.width >= 200 && r.height >= 150
	})
	if (!videos.length) return null
	return videos.find(v => !v.paused) || videos[0]
}

function isTyping(el) {
	return !!el && (el.isContentEditable ||
		el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')
}

// Elements that act on Space/Enter themselves — don't steal those keys from them.
function isClickable(el) {
	if (!el) return false
	if (el.tagName === 'BUTTON' || el.tagName === 'A' || el.tagName === 'SUMMARY') return true
	const role = el.getAttribute && el.getAttribute('role')
	return ['button', 'link', 'menuitem', 'menuitemradio', 'menuitemcheckbox',
		'tab', 'option', 'checkbox', 'switch', 'radio'].includes(role)
}

// Widgets that use the arrow keys themselves (sliders, menus, ...).
function usesArrowKeys(el) {
	if (!el) return false
	const role = el.getAttribute && el.getAttribute('role')
	return ['slider', 'spinbutton', 'listbox', 'menu', 'menubar', 'tablist', 'tree'].includes(role)
}

// --- Site-specific overrides ------------------------------------------------
// Scoped fixes for players that can't be driven the universal way. Each entry is
// gated on location.hostname, so any site NOT listed here is completely
// unaffected — the universal behavior stays the default everywhere else. To
// support a new site, add an entry; don't touch the generic code below.
const SITE_OVERRIDES = [
	{
		// Codecademy plays Skillsoft Percipio videos in a cross-origin iframe.
		// The player is video.js wrapped in React, which re-applies its own
		// caption state, so setting textTrack.mode gets reverted. Drive the
		// player's own caption control instead.
		matches: host => host === 'percipio.com' || host.endsWith('.percipio.com'),
		toggleCaptions: () => {
			const btn = document.querySelector('#video-player-cc-settings-button')
			if (!btn) return false
			btn.click()
			return true
		}
	}
]

function siteOverride() {
	return SITE_OVERRIDES.find(o => o.matches(location.hostname)) || null
}

function captionTracks(video) {
	return Array.from((video && video.textTracks) || []).filter(t => t.kind === 'captions' || t.kind === 'subtitles')
}

function captionsOn(video) {
	return captionTracks(video).some(t => t.mode === 'showing')
}

function toggleCaptions(video) {
	const override = siteOverride()
	if (override && override.toggleCaptions && override.toggleCaptions(video)) return

	const tracks = captionTracks(video)
	if (!tracks.length) return
	if (captionsOn(video)) {
		tracks.forEach(t => { t.mode = 'disabled' })
	} else {
		// Prefer a track matching the page language, otherwise the first one.
		const lang = (document.documentElement.lang || '').slice(0, 2).toLowerCase()
		const pick = tracks.find(t => (t.language || '').slice(0, 2).toLowerCase() === lang) || tracks[0]
		pick.mode = 'showing'
	}
}

window.addEventListener('keydown', function(event) {
	if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return
	// The page already handled this key — stay out of the way.
	if (event.defaultPrevented) return

	const key = event.key
	const isSeek = key === 'ArrowLeft' || key === 'ArrowRight'
	const isVolume = key === 'ArrowUp' || key === 'ArrowDown'
	const isPlayPause = key === ' ' || key === 'Spacebar' || key === 'Enter'
	if (!isSeek && !isVolume && !isPlayPause) return

	const target = event.target
	if (isTyping(target)) return
	if ((isSeek || isVolume) && usesArrowKeys(target)) return
	if (isPlayPause && isClickable(target)) return

	const video = getActiveVideo()
	if (!video) return

	if (isSeek) {
		const end = isFinite(video.duration) ? video.duration : Infinity
		const delta = key === 'ArrowRight' ? 5 : -5
		video.currentTime = Math.min(end, Math.max(0, video.currentTime + delta))
	} else if (isVolume) {
		video.muted = false
		const delta = key === 'ArrowUp' ? 0.05 : -0.05
		video.volume = Math.min(1, Math.max(0, video.volume + delta))
	} else {
		if (video.paused) {
			const playPromise = video.play()
			if (playPromise) playPromise.catch(() => {})
		} else {
			video.pause()
		}
	}

	// We handled it — prevent the page's default (scrolling on Space/arrows).
	event.preventDefault()
}, false)

// Captions toggle ('c'). 'c' has no default browser action, so a site that owns
// it (YouTube, LinkedIn Learning, ...) won't call preventDefault for us to
// detect. So we snapshot the caption state in the CAPTURE phase — before any
// page handler runs — then on the next tick only toggle if nothing else changed
// it. That way the site's own shortcut wins where it exists and we never
// double-toggle; we only fill in on players that don't handle 'c' themselves.
window.addEventListener('keydown', function(event) {
	if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return
	if (event.key !== 'c' && event.key !== 'C') return
	if (isTyping(event.target)) return

	const override = siteOverride()
	const video = getActiveVideo()
	// Without a site-specific toggler we need a native caption track to work with.
	if (!override && (!video || !captionTracks(video).length)) return

	const before = captionsOn(video)
	setTimeout(() => {
		if (captionsOn(video) === before) toggleCaptions(video)
	}, 0)
}, true)
