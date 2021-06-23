// ==UserScript==
// @name            Youtube Genius Lyrics
// @description     Shows lyrics/songtexts from genius.com on Youtube next to music videos
// @description:es  Mostra la letra de genius.com de las canciones en Youtube junto a los vídeos musicales
// @description:de  Zeigt den Songtext von genius.com neben Musikvideos auf Youtube
// @description:fr  Présente les paroles des chansons de genius.com sur Youtube à côté des vidéos de musique.
// @description:pl  Pokazuje teksty piosenek z genius.com na Youtube obok teledysków
// @description:pt  Mostra letras de canções de genius.com no Youtube ao lado de vídeos de música
// @description:it  Mostra i testi delle canzoni di genius.com su Youtube accanto ai video musicali
// @description:ja  Youtube（ユーチューブ）では、ミュージックビデオの横に genius.com の歌詞が表示されます
// @license         GPL-3.0-or-later; http://www.gnu.org/licenses/gpl-3.0.txt
// @copyright       2020, cuzi (https://github.com/cvzi)
// @author          cuzi
// @supportURL      https://github.com/cvzi/Youtube-Genius-Lyrics-userscript/issues
// @updateURL       https://openuserjs.org/meta/cuzi/Youtube_Genius_Lyrics.meta.js
// @version         10.6
// @require         https://openuserjs.org/src/libs/cuzi/GeniusLyrics.js
// @grant           GM.xmlHttpRequest
// @grant           GM.setValue
// @grant           GM.getValue
// @grant           GM.registerMenuCommand
// @connect         genius.com
// @include         https://www.youtube.com/*
// @include         https://music.youtube.com/*
// ==/UserScript==

/*
    Copyright (C) 2020 cuzi (cuzi@openmail.cc)

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

/* global GM, genius, geniusLyrics */ // eslint-disable-line no-unused-vars

'use strict'

let genius
const SCRIPT_NAME = 'Youtube Genius Lyrics'
const musicKeywords = [
  'music', 'musik', 'album', 'single',
  'hiphop', 'hip-hop', 'hip hop', 'rap',
  'rnb', 'r\'n\'n', 'r&b',
  'dance',
  'reggae',
  'folk',
  'indie',
  'metal',
  'pop',
  'punk',
  'rock'
]
const musicDescriptors = [
  'Music video',
  'Music Group',
  'Composer',
  'Lyricist',
  'full track',
  'vevo.ly',
  'Provided to YouTube by ',
  'Columbia Records',
  'Sony Music',
  'track produced by',
  'song produced by',
  'new ep',
  'new album',
  'new track',
  '.lnk.to/'
]

function addCss () {
  // Spotify
  document.head.appendChild(document.createElement('style')).innerHTML = `
  #myconfigwin39457845 {
    z-index:2060 !important;
  }
  #lyricscontainer {
    position:fixed;
    right:0px;
    margin:0px;
    padding:0px;
    background:white;
    z-index:2001;
    font-size:1.4rem;
    border:none;
    border-radius:none;
  }
  #lyricsiframe {
    opacity:0.1;
    transition:opacity 2s;
    margin:0px;
    padding:0px;
  }
  .lyricsnavbar {
    font-size : 0.7em;
    text-align:right;
    padding-right:10px;
    background:#fafafa;
   }
  .lyricsnavbar span,.lyricsnavbar a:link,.lyricsnavbar a:visited  {
    color:#606060;
    text-decoration:none;
    transition:color 400ms;
   }
  .lyricsnavbar a:hover,.lyricsnavbar span:hover {
    color:#9026e0;
    text-decoration:none;
  }
  .loadingspinner {
      color:black;
      font-size:1em;
      line-height:2.5em;
    }
  .loadingspinnerholder {
    z-index:2050;
    background-color:white;
    position:absolute;
    top:56px;
    right:100px;
    cursor:progress
  }
  .lorem {padding:10px 0px 0px 15px; font-size: 1.4rem;line-height: 2.2rem;letter-spacing: 0.3rem;}
  .lorem .white {background:white;color:white}
  .lorem .gray {background:rgb(204, 204, 204);color:rgb(204, 204, 204)}
  `
}

function calcContainerWidthTop () {
  let w
  const upnext = document.querySelector('#secondary #secondary-inner') || document.getElementById('upnext')
  const playlist = document.querySelector('ytd-playlist-panel-renderer#playlist')
  const video = document.querySelector('ytd-watch-flexy div#primary video')

  if (upnext && upnext.getBoundingClientRect().left > 0) {
    w = window.innerWidth - upnext.getBoundingClientRect().left - 5
  } else if (playlist && playlist.getBoundingClientRect().left > 0) {
    w = window.innerWidth - playlist.getBoundingClientRect().left - 5
  } else if (video) {
    w = window.innerWidth - 1.02 * video.getClientRects()[0].right
  } else {
    w = window.innerWidth * 0.45
  }
  w = Math.min(window.innerWidth * 0.75, w)
  const top = document.getElementById('masthead-container').clientHeight
  return [w, top]
}

function setFrameDimensions (container, iframe) {
  const bar = container.querySelector('.lyricsnavbar')
  const width = iframe.style.width = container.clientWidth - 1 + 'px'
  const height = iframe.style.height = window.innerHeight - bar.clientHeight - document.getElementById('masthead-container').clientHeight + 'px'

  if (genius.option.themeKey === 'spotify') {
    iframe.style.backgroundColor = '#181818'
    bar.style.backgroundColor = '#181818'
  } else {
    iframe.style.backgroundColor = ''
  }

  return [width, height]
}

function onResize () {
  window.setTimeout(function () {
    genius.option.resizeOnNextRun = true
  }, 200)
}

function resize () {
  const container = document.getElementById('lyricscontainer')
  const iframe = document.getElementById('lyricsiframe')

  if (!container) {
    return
  }

  const [w, top] = calcContainerWidthTop()

  container.style.top = top + 'px'
  container.style.width = w + 'px'

  if (iframe) {
    setFrameDimensions(container, iframe)
  }
}

function getCleanLyricsContainer () {
  let container

  const [w, top] = calcContainerWidthTop()

  if (!document.getElementById('lyricscontainer')) {
    container = document.createElement('div')
    container.id = 'lyricscontainer'
    document.body.appendChild(container)
  } else {
    container = document.getElementById('lyricscontainer')
    container.innerHTML = ''
  }
  container.style = ''
  container.style.top = top + 'px'
  container.style.width = w + 'px'

  return document.getElementById('lyricscontainer')
}

function hideLyrics () {
  document.querySelectorAll('.loadingspinner').forEach((spinner) => spinner.remove())
  if (document.getElementById('lyricscontainer')) {
    document.getElementById('lyricscontainer').remove()
  }
  addLyricsButton()
}

let checkFullscreenIV
function addLyricsButton () {
  if (document.getElementById('showlyricsbutton')) {
    return
  }
  const top = calcContainerWidthTop()[1]
  const b = document.createElement('div')
  b.setAttribute('id', 'showlyricsbutton')
  b.setAttribute('style', 'position:absolute;top:' + (top + 2) + 'px;right:0px;color:#ffff64;cursor:pointer;background:#000a;border-radius:50%;margin:auto;padding:0px 1px;text-align:center;font-size:15px;line-height:14px;z-index:3000')
  b.setAttribute('title', 'Load lyrics from genius.com')
  b.appendChild(document.createTextNode('🅖'))
  b.addEventListener('click', function onShowLyricsButtonClick () {
    genius.option.autoShow = true // Temporarily enable showing lyrics automatically on song change
    window.clearInterval(genius.iv.main)
    genius.iv.main = window.setInterval(main, 2000)
    b.remove()
    addLyrics(true)
  })
  document.body.appendChild(b)
  if (b.clientWidth < 10) {
    b.setAttribute('style', 'position:absolute; top: 0px; right:0px; background-color:#0008; color:#ffff64; cursor:pointer; z-index:3000;border:2px solid #ffff64;border-radius: 100%;padding: 0px 3px;font-size: 12px;')
    b.innerHTML = 'G'
  }

  window.clearInterval(checkFullscreenIV)
  checkFullscreenIV = window.setInterval(function () {
    if (document.getElementById('showlyricsbutton')) {
      document.getElementById('showlyricsbutton').style.display = document.fullscreenElement ? 'none' : 'block'
    }
  }, 1000)
}

let lastVideoId = null
let lastForceVideoId = null
function addLyrics (force, beLessSpecific) {
  const h1 = document.querySelector('#content ytd-watch-flexy:not([hidden]) #container .title')
  if (!h1 || !document.querySelector('ytd-watch-flexy div#primary video')) {
    // Not a video page or video page not visible
    hideLyrics()
    return
  }
  let isMusic = false

  const videoTitle = h1.textContent.toLowerCase()
  if (videoTitle.indexOf('official video') !== -1 || videoTitle.indexOf('music video') !== -1 || videoTitle.indexOf('audio') !== -1) {
    isMusic = true
  }
  if (videoTitle.match(/.+\s+[-–]\s+.+/)) {
    isMusic = true
  }
  let videoDetails
  try {
    const ytdAppData = document.querySelector('ytd-app').__data.data
    if ('player' in ytdAppData && 'args' in ytdAppData.player && 'raw_player_response' in ytdAppData.player.args && 'videoDetails' in ytdAppData.player.args.raw_player_response) {
      videoDetails = ytdAppData.player.args.raw_player_response.videoDetails
    } else {
      videoDetails = ytdAppData.playerResponse.videoDetails
    }
  } catch (e) {
    console.warn(SCRIPT_NAME + ' addLyrics() Could not find videoDetails')
    console.log(e)
    videoDetails = { keywords: [], shortDescription: '' }
    if (document.getElementById('meta')) {
      videoDetails.shortDescription = document.getElementById('meta').textContent
    }
    const m = document.location.href.match(/v=(\w+)&?/)
    if (m && m[1]) {
      videoDetails.videoId = m[1]
    }
  }
  if (!videoDetails.keywords) {
    videoDetails.keywords = []
  }

  if ('videoId' in videoDetails) {
    if (lastVideoId === videoDetails.videoId + genius.option.themeKey && document.getElementById('lyricscontainer')) {
      // Same video id and same theme and lyrics are showing -> stop here
      return
    } else {
      lastVideoId = videoDetails.videoId + genius.option.themeKey
    }
  } else {
    lastVideoId = null
  }
  if (force) {
    isMusic = true
    lastForceVideoId = lastVideoId
  }

  if (!isMusic) {
    const keywords = videoDetails.keywords.join('').toLowerCase()
    for (let i = 0; i < musicKeywords.length; i++) {
      if (keywords.indexOf(musicKeywords[i].toLowerCase()) !== -1) {
        isMusic = true
        break
      }
    }
    videoDetails.shortDescription = videoDetails.shortDescription.toLowerCase()
    for (let i = 0; i < musicDescriptors.length; i++) {
      if (videoDetails.shortDescription.indexOf(musicDescriptors[i].toLowerCase()) !== -1) {
        isMusic = true
        break
      }
    }
  }

  if (!isMusic && (lastForceVideoId == null || lastForceVideoId !== lastVideoId)) {
    hideLyrics()
    return
  }
  let songArtists
  let songTitle = videoTitle.replace(/\(.+?\)/, '')
  songTitle = songTitle.replace(/\[.+?\]/, '')

  songTitle = songTitle.replace(/official\s*audio/, '')
  songTitle = songTitle.replace(/official\s*music\s*video/, '')
  songTitle = songTitle.replace(/official\s*video/, '')
  songTitle = songTitle.replace(/music\s*video/, '')
  songTitle = songTitle.replace(/video/, '')
  songTitle = songTitle.replace(/music/, '')
  songTitle = songTitle.replace(/exclusive\s*-?/, '')
  songTitle = songTitle.trim()

  // Pattern: Artist  - Song title
  songTitle = songTitle.split(/\s+[-–]\s+/)

  if (songTitle.length === 1) {
    // Pattern: Artist | Song title
    const m = songTitle[0].match(/(.+?)\s*\|\s*(.+)/)
    if (m) {
      songTitle = [m[1], m[2]]
    }
  }

  if (songTitle.length === 1) {
    // Pattern: Artist "Song title"
    const m = songTitle[0].match(/(.+?)\s*["“”'`´*]+(.+)["“”'`´*]+/)
    if (m) {
      songTitle = [m[1], m[2]]
    }
  }

  if (songTitle.length === 1) {
    // Pattern: Songtitle by Artist
    const m = songTitle[0].match(/(.+?)\s+by\s+(.+)/)
    if (m) {
      songTitle = [m[2], m[1]]
    }
  }

  if (songTitle.length === 1 && 'author' in videoDetails) {
    // Fallback to video author name
    songArtists = videoDetails.author.toLowerCase()
    songArtists = songArtists.replace(/vevo/, '')
    songArtists = songArtists.replace(/official/, '')
    songArtists = songArtists.replace(/music/, '')
    songArtists = songArtists.replace(/band/, '')
    songArtists = songArtists.replace(/-\s*topic/, '')
  } else {
    songArtists = songTitle.shift().trim()
  }

  const songArtistsArr = songArtists.split(',').map(s => s.trim())
  songTitle = songTitle.join(' - ').trim()

  songTitle = genius.f.cleanUpSongTitle(songTitle)

  const musicIsPlaying = document.querySelector('.ytp-play-button.ytp-button').title.indexOf('Pause') !== -1
  genius.f.loadLyrics(force, beLessSpecific, songTitle, songArtistsArr, musicIsPlaying)
}

let lastPos = null
function updateAutoScroll () {
  let pos = null
  try {
    const video = document.querySelector('video')
    pos = video.currentTime / video.duration
  } catch (e) {
    // Could not parse current song position
    pos = null
  }
  if (pos != null && !Number.isNaN(pos) && lastPos !== pos) {
    genius.f.scrollLyrics(pos)
    lastPos = pos
  }
}

function showSearchField (query) {
  const b = getCleanLyricsContainer()

  b.style.border = '1px solid black'
  b.style.borderRadius = '3px'
  b.style.padding = '5px'

  b.appendChild(document.createTextNode('Search genius.com: '))
  b.style.paddingRight = '15px'
  const input = b.appendChild(document.createElement('input'))
  input.className = 'SearchInputBox__input'
  input.placeholder = 'Search genius.com...'

  const span = b.appendChild(document.createElement('span'))
  span.style = 'cursor:pointer'
  span.appendChild(document.createTextNode(' \uD83D\uDD0D'))

  // Hide button
  const hideButton = b.appendChild(document.createElement('span'))
  hideButton.style = 'cursor:pointer;padding-left: 10px;color: black;font-size: larger;vertical-align: top;'
  hideButton.title = 'Hide'
  hideButton.appendChild(document.createTextNode('\uD83C\uDD87'))
  hideButton.addEventListener('click', function hideButtonClick (ev) {
    ev.preventDefault()
    hideLyrics()
  })

  if (query) {
    input.value = query
  } else if (genius.current.artists) {
    input.value = genius.current.artists
  }
  input.addEventListener('change', function onSearchLyricsButtonClick () {
    if (input.value) {
      genius.f.searchByQuery(input.value, b)
    }
  })
  input.addEventListener('keyup', function onSearchLyricsKeyUp (ev) {
    if (ev.keyCode === 13) {
      ev.preventDefault()
      if (input.value) {
        genius.f.searchByQuery(input.value, b)
      }
    }
  })
  span.addEventListener('click', function onSearchLyricsKeyUp (ev) {
    if (input.value) {
      genius.f.searchByQuery(input.value, b)
    }
  })

  document.body.appendChild(b)
  input.focus()
}

function listSongs (hits, container, query) {
  if (!container) {
    container = getCleanLyricsContainer()
  }

  // Back to search button
  const backToSearchButton = document.createElement('a')
  backToSearchButton.href = '#'
  backToSearchButton.appendChild(document.createTextNode('Back to search'))
  backToSearchButton.addEventListener('click', function backToSearchButtonClick (ev) {
    ev.preventDefault()
    if (query) {
      showSearchField(query)
    } else if (genius.current.artists) {
      showSearchField(genius.current.artists + ' ' + genius.current.title)
    } else {
      showSearchField()
    }
  })

  const separator = document.createElement('span')
  separator.setAttribute('class', 'second-line-separator')
  separator.setAttribute('style', 'padding:0px 3px')
  separator.appendChild(document.createTextNode('•'))

  // Hide button
  const hideButton = document.createElement('a')
  hideButton.href = '#'
  hideButton.appendChild(document.createTextNode('Hide'))
  hideButton.addEventListener('click', function hideButtonClick (ev) {
    ev.preventDefault()
    hideLyrics()
  })

  // List search results
  const trackhtml = '<div style="float:left;"><div class="onhover" style="margin-top:-0.25em;display:none"><span style="color:black;font-size:2.0em">🅖</span></div><div class="onout"><span style="font-size:1.5em">📄</span></div></div>' +
  '<div style="float:left; margin-left:5px">$artist • $title <br><span style="font-size:0.7em">👁 $stats.pageviews $lyrics_state</span></div><div style="clear:left;"></div>'
  container.innerHTML = '<ol class="tracklist" style="width:99%; font-size:1.15em"></ol>'

  container.style.border = '1px solid black'
  container.style.borderRadius = '3px'

  container.insertBefore(hideButton, container.firstChild)
  container.insertBefore(separator, container.firstChild)
  container.insertBefore(backToSearchButton, container.firstChild)

  const ol = container.querySelector('ol.tracklist')
  ol.style.listStyle = 'none'
  const searchresultsLengths = hits.length
  const title = genius.current.title
  const artists = genius.current.artists
  const onclick = function onclick () {
    genius.f.rememberLyricsSelection(title, artists, this.dataset.hit)
    genius.f.showLyrics(JSON.parse(this.dataset.hit), searchresultsLengths)
  }
  const mouseover = function onmouseover () {
    this.querySelector('.onhover').style.display = 'block'
    this.querySelector('.onout').style.display = 'none'
    this.style.backgroundColor = 'rgb(200, 200, 200)'
  }
  const mouseout = function onmouseout () {
    this.querySelector('.onhover').style.display = 'none'
    this.querySelector('.onout').style.display = 'block'
    this.style.backgroundColor = 'rgb(255, 255, 255)'
  }

  hits.forEach(function forEachHit (hit) {
    const li = document.createElement('li')
    li.style.cursor = 'pointer'
    li.style.transition = 'background-color 0.2s'
    li.style.padding = '3px'
    li.style.margin = '2px'
    li.style.borderRadius = '3px'
    li.innerHTML = trackhtml.replace(/\$title/g, hit.result.title_with_featured).replace(/\$artist/g, hit.result.primary_artist.name).replace(/\$lyrics_state/g, hit.result.lyrics_state).replace(/\$stats\.pageviews/g, genius.f.metricPrefix(hit.result.stats.pageviews, 1))
    li.dataset.hit = JSON.stringify(hit)

    li.addEventListener('click', onclick)
    li.addEventListener('mouseover', mouseover)
    li.addEventListener('mouseout', mouseout)
    ol.appendChild(li)
  })
}

function loremIpsum () {
  const classText = ['<span class="gray">', '</span>']
  const classWhitespace = ['<span class="white">', '</span>']
  const random = (x) => 1 + parseInt(Math.random() * x)
  let text = ''
  for (let v = 0; v < Math.max(3, random(5)); v++) {
    for (let b = 0; b < random(6); b++) {
      const line = []
      for (let l = 0; l < random(9); l++) {
        for (let w = 0; w < 1 + random(10); w++) {
          for (let i = 0; i < 1 + random(7); i++) {
            line.push('x')
          }
          line.push(classText[1] + classWhitespace[0] + '&#160;' + classWhitespace[1] + classText[0])
        }
        line.push(classText[1] + '\n<br>\n' + classText[0])
      }
      text += classText[0] + line.join('') + classText[1] + '\n<br>\n'
    }
  }
  return text
}

function createSpinner (spinnerHolder) {
  const lyricscontainer = document.getElementById('lyricscontainer')

  const rect = lyricscontainer.getBoundingClientRect()
  spinnerHolder.style.left = ''
  spinnerHolder.style.right = '0px'
  spinnerHolder.style.top = lyricscontainer.style.top || '56px'
  spinnerHolder.style.width = lyricscontainer.style.width || (rect.width - 1 + 'px')

  const spinner = spinnerHolder.appendChild(document.createElement('div'))
  spinner.classList.add('loadingspinner')
  spinner.style.marginLeft = (rect.width / 2) + 'px'

  const lorem = spinnerHolder.appendChild(document.createElement('div'))
  lorem.classList.add('lorem')
  lorem.innerHTML = loremIpsum()

  function resizeSpinner () {
    const spinnerHolder = document.querySelector('.loadingspinnerholder')
    const lyricscontainer = document.getElementById('lyricscontainer')
    if (spinnerHolder && lyricscontainer) {
      const rect = lyricscontainer.getBoundingClientRect()
      spinnerHolder.style.top = lyricscontainer.style.top || '56px'
      spinnerHolder.style.width = lyricscontainer.style.width || (rect.width - 1 + 'px')
      const loadingSpinner = spinnerHolder.querySelector('.loadingspinner')
      if (loadingSpinner) {
        loadingSpinner.style.marginLeft = (rect.width / 2) + 'px'
      }
    } else {
      window.clearInterval(resizeSpinnerIV)
    }
  }
  const resizeSpinnerIV = window.setInterval(resizeSpinner, 1000)

  return spinner
}

function main () {
  if (document.querySelector('#container .title') && document.querySelector('#container .title').textContent) {
    if (genius.option.autoShow) {
      addLyrics()
    } else {
      addLyricsButton()
    }
    if (genius.option.resizeOnNextRun) {
      genius.option.resizeOnNextRun = false
      resize()
    }
  }
}

function newAppHint (status) {
  // TODO should this be removed in favor of a README hint in the next version?
  if (document.location.pathname === '/robots.txt') {
    return
  }
  if (document.getElementById('lyricscontainer') || document.getElementById('showlyricsbutton')) {
    // Other script already running
    return GM.setValue('newapphint', -1)
  }

  if (status % 10 === 0) {
    document.head.appendChild(document.createElement('style')).innerHTML = `
    #newapphint785 {
      position:fixed;
      top:0%;
      left:0%;
      padding:10px;
      background-color:#202020;
      color:#bbb;
      font-size:large;
      border:2px solid red;
      border-radius: 5px;
      box-shadow: red 1px 1px 10px;
      transition:left 500ms, top 500ms;
      z-index:2500
    }
    #newapphint785 a:link, #newapphint785 a:visited {
      color:white;
      text-decoration:none
    }
    #newapphint785 a:hover {
      color:#b0ae10;
      text-decoration:none
    }
    #newapphint785 button {
      font-size: large;
      background: #555;
      border: 2px outset #555;
      margin: 3px 10px;
      padding: 2px;
      color: #eee;
    }
    #newapphint785 button:hover {
      border: 2px outset #fff;
      color: #fff;
    }
    `

    const container = document.createElement('div')
    container.id = 'newapphint785'
    document.body.appendChild(container)

    container.appendChild(document.createElement('h2')).appendChild(document.createTextNode('⚠️ Youtube Genius Lyrics 🆕'))
    const p = container.appendChild(document.createElement('p'))
    p.appendChild(document.createTextNode('▶️ If you would like to see lyrics here as well, you can now install a new userscript specifically for music.youtube.com:'))
    p.appendChild(document.createElement('br'))
    p.appendChild(document.createElement('br'))

    const aSource = p.appendChild(document.createElement('a'))
    aSource.target = '_blank'
    aSource.href = 'https://openuserjs.org/scripts/cuzi/Youtube_Music_Genius_Lyrics'
    aSource.appendChild(document.createTextNode('📑 https://openuserjs.org/scripts/cuzi/Youtube_Music_Genius_Lyrics'))

    p.appendChild(document.createElement('br'))
    p.appendChild(document.createElement('br'))

    const aInstall = p.appendChild(document.createElement('a'))
    aInstall.href = 'https://openuserjs.org/install/cuzi/Youtube_Music_Genius_Lyrics.user.js'
    aInstall.appendChild(document.createTextNode('💘 Click to install new script'))
    aInstall.addEventListener('click', function () {
      GM.setValue('newapphint', -1).then(function () {
        aInstall.innerHTML = 'ℹ️ Please reload (F5) the page after installing'
      })
    })

    p.appendChild(document.createElement('br'))
    p.appendChild(document.createElement('br'))

    const remindMeLater = container.appendChild(document.createElement('button'))
    remindMeLater.appendChild(document.createTextNode('🔜 Remind me later'))
    remindMeLater.addEventListener('click', function () {
      GM.setValue('newapphint', 1).then(() => container.remove())
    })

    container.appendChild(document.createElement('br'))

    const doNotShowAgain = container.appendChild(document.createElement('button'))
    doNotShowAgain.appendChild(document.createTextNode('🆗🆒 Do not show again'))
    doNotShowAgain.addEventListener('click', function () {
      GM.setValue('newapphint', -1).then(() => container.remove())
    })

    window.setTimeout(function () {
      container.style.left = `calc(50% - ${container.clientWidth / 2}px)`
      container.style.top = `calc(50% - ${container.clientHeight / 2}px)`
    }, 100)
  } else if (status > 0) {
    GM.setValue('newapphint', status + 1)
  }
}

if (document.location.hostname.startsWith('music')) {
  GM.getValue('newapphint', 0).then(function (status) {
    window.setTimeout(() => newAppHint(status), 5000)
  })
} else {
  genius = geniusLyrics({
    GM: GM,
    scriptName: SCRIPT_NAME,
    scriptIssuesURL: 'https://github.com/cvzi/Youtube-Genius-Lyrics-userscript/issues',
    scriptIssuesTitle: 'Report problem: github.com/cvzi/Youtube-Genius-Lyrics-userscript/issues',
    domain: 'https://www.youtube.com/',
    emptyURL: 'https://www.youtube.com/robots.txt',
    main: main,
    addCss: addCss,
    listSongs: listSongs,
    showSearchField: showSearchField,
    addLyrics: addLyrics,
    hideLyrics: hideLyrics,
    getCleanLyricsContainer: getCleanLyricsContainer,
    setFrameDimensions: setFrameDimensions,
    onResize: onResize,
    createSpinner: createSpinner
  })
  GM.registerMenuCommand(SCRIPT_NAME + ' - Show lyrics', () => addLyrics(true))
  window.setInterval(updateAutoScroll, 7000)
}
