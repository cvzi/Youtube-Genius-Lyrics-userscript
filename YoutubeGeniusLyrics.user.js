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
// @icon            https://raw.githubusercontent.com/hfg-gmuend/openmoji/master/color/72x72/E044.png
// @supportURL      https://github.com/cvzi/Youtube-Genius-Lyrics-userscript/issues
// @version         10.6.7
// @require         https://greasyfork.org/scripts/406698-geniuslyrics/code/GeniusLyrics.js
// @grant           GM.xmlHttpRequest
// @grant           GM.setValue
// @grant           GM.getValue
// @grant           GM.registerMenuCommand
// @connect         genius.com
// @match           https://www.youtube.com/*
// @match           https://music.youtube.com/*
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

let lyricsDisplayState = 'hidden'

function addCss () {
  // Spotify
  document.head.appendChild(document.createElement('style')).innerHTML = `
  #myconfigwin39457845 {
    z-index:2060 !important;
  }
  #lyricscontainer {
    position:fixed;
    right:0;
    margin:0px;
    padding:0px;
    background-color:white;
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
    background-color:#fafafa;
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
    cursor:progress;
  }
  .lorem {
    padding:10px 0px 0px 15px;
    font-size: 1.4rem;
    line-height: 2.2rem;
    letter-spacing: 0.3rem;
    user-select: none !important;
    pointer-events: none !important;
  }
  .lorem .white {
    background-color:white;
    color:white;
    user-select: none !important;
  }
  .lorem .gray {
    background-color:rgb(204, 204, 204);
    color:rgb(204, 204, 204);
    user-select: none !important;
  }
  #showlyricsbutton {
    position:absolute;
    z-index:3000;
    right:0px;
    color:#ffff64;
    cursor:pointer;
    background-color:#000a;
    border-radius:50%;
    margin:auto;
    padding:0px 1px;
    text-align:center;
    font-size:15px;
    line-height:14px;
  }
  #showlyricsbutton.youtube-genius-lyrics-button-g-small{
    /*
    position:absolute;
    z-index:3000;
    right:0px;
    color:#ffff64;
    cursor:pointer;
    */
    background-color:#0008;
    border-radius: 100%;
    top: 0px;
    border:2px solid #ffff64;
    padding: 0px 3px;
    font-size: 12px;
  }
  .youtube-genius-lyrics-search-container{
    border: 1px solid black;
    border-radius: 3px;
    padding: 5px;
    padding-right: 15px;
  }
  span.youtube-genius-lyrics-search-container-span{
    cursor:pointer;
    vertical-align: middle;
  }
  span.youtube-genius-lyrics-search-container-hide-btn{
    cursor:pointer;
    padding-left: 10px;
    color: black;
    font-size: larger;
    vertical-align: middle;
  }
  span.youtube-genius-lyrics-second-line-separator{
    padding:0px 3px;
  }
  .youtube-genius-lyrics-results-container{
    border: 1px solid black;
    border-radius: 3px;
  }
  ol.youtube-genius-lyrics-tracklist{
    list-style: none;
    width:99%;
    font-size:1.15em;
  }
  li.youtube-genius-lyrics-result{
    cursor: pointer;
    transition: background-color 0.2s;
    padding: 3px;
    margin: 2px;
    border-radius: 3px;
  }
  .youtube-genius-lyrics-results-container-hide-btn,
  .youtube-genius-lyrics-results-container-back-btn{
    cursor:pointer;
  }
  li.youtube-genius-lyrics-result div.onhover{
    display:none;
    margin-top:-0.25em;
  }
  li.youtube-genius-lyrics-result div.onout{
    display:block;
  }
  li.youtube-genius-lyrics-result{
    background-color:rgb(255, 255, 255);
  }
  li.youtube-genius-lyrics-result:hover div.onhover{
    display:block;
  }
  li.youtube-genius-lyrics-result:hover div.onout{
    display:none;
  }
  li.youtube-genius-lyrics-result:hover{
    background-color:rgb(200, 200, 200);
  }
  li.youtube-genius-lyrics-result *{
    pointer-events:none;
  }
  li.youtube-genius-lyrics-result div.onhover span{
    color:black;font-size:2.0em;
  }
  li.youtube-genius-lyrics-result div.onout span{
    font-size:1.5em;
  }
  html[youtube-genius-lyrics-container] ytd-watch-flexy[theater] #movie_player .ytp-left-controls {
    max-width: 50%;
  }
  html[youtube-genius-lyrics-container] ytd-watch-flexy[theater] #movie_player .ytp-right-controls {
    float: right;
  }
  `
}

function appendElements (target, elements) {
  if (typeof target.append === 'function') {
    target.append(...elements)
  } else {
    for (const element of elements) {
      target.appendChild(element)
    }
  }
}

const removeElements = (typeof window.DocumentFragment.prototype.append === 'function')
  ? function (elements) {
    document.createDocumentFragment().append(...elements)
  }
  : function (elements) {
    for (const element of elements) {
      element.remove()
    }
  }

function getMastheadHeight () {
  const masthead = document.querySelector('ytd-masthead#masthead')
  return masthead.getBoundingClientRect().height
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
    w = window.innerWidth - 1.02 * video.getBoundingClientRect().right
  } else {
    w = window.innerWidth * 0.45
  }
  w = Math.min(window.innerWidth * 0.75, w)

  const top = getMastheadHeight()
  if (isTheatherView) {
    return {
      top,
      width: parseInt(0.3 * document.querySelector('#columns').clientWidth),
      isTheatherView
    }
  } else {
    return {
      top,
      width: w,
      isTheatherView
    }
  }
}

function setFrameDimensions (container, iframe, bar) {
  // const bar = container.querySelector('.lyricsnavbar')
  // const width = iframe.style.width = container.clientWidth - 1 + 'px'
  // const height = iframe.style.height = window.innerHeight - bar.clientHeight - getMastheadHeight() + 'px'
  iframe.style.width = container.clientWidth - 1 + 'px'
  iframe.style.height = window.innerHeight - bar.clientHeight - getMastheadHeight() + 'px'

  if (genius.option.themeKey === 'spotify') {
    iframe.style.backgroundColor = '#181818'
    bar.style.backgroundColor = '#181818'
  } else {
    iframe.style.backgroundColor = ''
  }

  // return [width, height]
}

let lastResizeDT = 0
function onResize () {
  let tdt = Date.now()
  lastResizeDT = tdt
  window.setTimeout(function () {
    if (tdt === lastResizeDT) {
      genius.option.resizeOnNextRun = true
      resize()
    }
  }, 600)
}

function resize () {
  const container = document.getElementById('lyricscontainer')
  const iframe = document.getElementById('lyricsiframe')

  if (!container) {
    return
  }

  const { top, width } = calcContainerWidthTop()

  container.style.top = `${top}px`
  container.style.width = `${width}px`

  if (iframe) {
    const bar = container.querySelector('.lyricsnavbar')
    setFrameDimensions(container, iframe, bar)
  }
}

function getCleanLyricsContainer () {
  let container = null

  const { top, width } = calcContainerWidthTop()

  if (!document.getElementById('lyricscontainer')) {
    container = document.createElement('div')
    container.id = 'lyricscontainer'
    document.body.appendChild(container)
  } else {
    container = document.getElementById('lyricscontainer')
    container.innerHTML = ''
    container.clasName = ''
    container.style = ''
  }

  container.style.top = `${top}px`
  container.style.width = `${width}px`
  document.body.appendChild(container)

  const result = document.getElementById('lyricscontainer')
  if (result !== container) {
    console.warn(SCRIPT_NAME + ' getCleanLyricsContainer() Could not insert the element correctly')
  }

  return result
}

function hideLyrics () {
  const elementsToBeRemoved = [...document.querySelectorAll('.loadingspinner')]
  const lyricscontainer = document.getElementById('lyricscontainer')
  if (lyricscontainer) {
    elementsToBeRemoved.push(lyricscontainer)
    document.documentElement.removeAttribute('youtube-genius-lyrics-container')
  }
  let isHiding = elementsToBeRemoved.length>0
  removeElements(elementsToBeRemoved)
  addLyricsButton()
  return isHiding
}

function hideLyricsWithMessage () {
  const ret = hideLyrics(...arguments)
  if(ret === false){
      return false
  }
  window.postMessage({ iAm: SCRIPT_NAME, type: 'lyricsDisplayState', visibility: 'hidden' }, '*')
  return ret
}

function onFullScreenChanged () {
  const showlyricsbutton = document.getElementById('showlyricsbutton')
  if (showlyricsbutton) {
    showlyricsbutton.style.display = document.fullscreenElement ? 'none' : 'block'
  }
}

async function showLyricsButtonClicked () {
  genius.option.autoShow = true // Temporarily enable showing lyrics automatically on song change
  addLyrics(true)
}

function addLyricsButton () {
  if (document.getElementById('showlyricsbutton')) {
    return
  }
  const top = getMastheadHeight()
  const b = document.createElement('div')
  b.setAttribute('id', 'showlyricsbutton')
  b.setAttribute('style', 'top:' + (top + 2) + 'px;')
  b.setAttribute('title', 'Load lyrics from genius.com')
  b.textContent = '🅖'
  b.addEventListener('click', function onShowLyricsButtonClick () {
    this.remove()
    showLyricsButtonClicked()
  })
  document.body.appendChild(b)
  if (b.clientWidth < 10) {
    b.classList.add('youtube-genius-lyrics-button-g-small')
    b.innerHTML = 'G'
  } else {
    b.classList.add('youtube-genius-lyrics-button-g-normal')
  }

  document.removeEventListener('fullscreenchange', onFullScreenChanged, false)
  document.addEventListener('fullscreenchange', onFullScreenChanged, false)
  window.setTimeout(onFullScreenChanged, 1000)
}

let lastVideoId = null
let lastForceVideoId = null
let isNormalView = false
let isTheatherView = false
let hitMaps = null

function obtainDataCarouselLockups (ep) {
  if (!ep) {
    return null
  }
  let m = null
  try {
    m = ep.engagementPanelSectionListRenderer.content.structuredDescriptionContentRenderer.items[2].videoDescriptionMusicSectionRenderer.carouselLockups
  } catch (e) {
    m = null
  }
  return m
}

function getSimpleText (defaultMetadata) {
  if (!defaultMetadata) {
    return null
  }
  if (typeof defaultMetadata.simpleText === 'string') {
    return defaultMetadata.simpleText
  }
  if (defaultMetadata.runs) {
    const texts = defaultMetadata.runs.map(entry => entry.text)
    if (texts.length === 1 && typeof texts[0] === 'string') {
      return texts[0]
    }
  }
  return null
}

function simpleTextFixup (text) {
  return text.replace(/だ/g, 'だ')
}

function getMusicTitleAndAuthor (pData) {
  const response = pData.response
  const engagementPanels = response.engagementPanels
  let carouselLockups = null
  for (const ep of engagementPanels) {
    const m = obtainDataCarouselLockups(ep)
    if (m !== null) {
      carouselLockups = m
      break
    }
  }

  if (carouselLockups && carouselLockups.length === 1) {
    let a1 = null
    let a2 = null
    try {
      a1 = carouselLockups[0].carouselLockupRenderer.infoRows[0].infoRowRenderer.defaultMetadata
      a2 = carouselLockups[0].carouselLockupRenderer.infoRows[1].infoRowRenderer.defaultMetadata
    } catch (e) { }
    a1 = getSimpleText(a1)
    a2 = getSimpleText(a2)

    if (a1 && a2 && typeof a1 === 'string' && typeof a2 === 'string') {
      let title = null
      try {
        title = pData.playerResponse.videoDetails.title
      } catch (e) { }
      if (title && typeof title === 'string') {
        a1 = simpleTextFixup(a1)
        a2 = simpleTextFixup(a2)
        title = simpleTextFixup(title)
        const newValue = `${a2} ${a1}`
        return {
          title,
          singer: a2,
          song: a1,
          text: newValue
        }
      }
    }
  }
  return null
}

function getYoutubeMainVideo () {
  let video = document.querySelector('#ytd-player #movie_player video[src]')
  if (video !== null) {
    return video
  }
  video = document.querySelector('video[src]')
  if (video !== null) {
    return video
  }
  return null
}

function isYoutubeVideoPlaying () {
  const videoPlayerContainer = document.querySelector('#ytd-player #movie_player')
  let video = null
  if (videoPlayerContainer) {
    const isPaused = videoPlayerContainer.classList.contains('paused-mode')
    if (isPaused) {
      return false
    }
    const isPlaying = videoPlayerContainer.classList.contains('playing-mode')
    if (isPlaying) {
      return true
    }
    video = window.HTMLElement.prototype.querySelector.call(videoPlayerContainer, 'video[src]')
    if (video !== null) {
      const paused = video.paused
      if (paused === true) {
        return false
      }
      if (paused === false) {
        return true
      }
    }
  }
  if (video === null) {
    video = document.querySelector('video[src]')
  }
  if (video !== null) {
    const paused = video.paused
    if (paused === true) {
      return false
    }
    if (paused === false) {
      return true
    }
  }
}

function traditionalYtdDescriptionInfo (videoTitle, videoDetails) {
  let songArtists
  let songTitle = videoTitle

  // song title text processing
  songTitle = songTitle.replace(/\(.+?\)/, '')
  songTitle = songTitle.replace(/\[.+?\]/, '')
  songTitle = songTitle.replace(/official\s*audio/, '')
  songTitle = songTitle.replace(/official\s*music\s*video/, '')
  songTitle = songTitle.replace(/official\s*video/, '')
  songTitle = songTitle.replace(/music\s*video/, '')
  songTitle = songTitle.replace(/video/, '')
  songTitle = songTitle.replace(/music/, '')
  songTitle = songTitle.replace(/exclusive\s*-?/, '')
  songTitle = songTitle.replace(/-\s*-/, ' - ')
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
  // return object result
  return { songTitle, songArtistsArr }
}

function newYtdDescriptionInfo (ytdDescriptionInfo) {
  const songArtistsArr = [ytdDescriptionInfo.singer]
  // const songArtists = ytdDescriptionInfo.singer
  const songTitle = ytdDescriptionInfo.song
  // return object result
  return { songTitle, songArtistsArr }
}

function addLyrics (force, beLessSpecific) {
  const h1 = document.querySelector('#content ytd-watch-flexy:not([hidden]) #container .title')
  isNormalView = !!document.querySelector('ytd-watch-flexy div#primary video')
  isTheatherView = !!document.querySelector('ytd-watch-flexy div#player-theater-container video')
  if (!h1 || (!isNormalView && !isTheatherView)) {
    // Not a video page or video page not visible
    hideLyricsWithMessage()
    return
  }

  let ytdAppData = null
  let videoDetails = null
  try {
    ytdAppData = document.querySelector('ytd-app').__data.data
    if ('player' in ytdAppData && 'args' in ytdAppData.player && 'raw_player_response' in ytdAppData.player.args && 'videoDetails' in ytdAppData.player.args.raw_player_response) {
      videoDetails = ytdAppData.player.args.raw_player_response.videoDetails
    } else {
      videoDetails = ytdAppData.playerResponse.videoDetails
    }
  } catch (e) {
    console.warn(SCRIPT_NAME + ' addLyrics() Could not find videoDetails')
    console.log(e)
    const m = document.location.href.match(/v=(\w+)&?/)
    videoDetails = {
      videoId: (m && m[1] ? m[1] : ''),
      keywords: [],
      shortDescription: ''
    }
  }
  if (!videoDetails.videoId) {
    lastVideoId = null
    hideLyricsWithMessage()
    return
  }
  const tmpVideoId = `${videoDetails.videoId}${genius.option.themeKey}`
  if (lastVideoId === tmpVideoId && document.getElementById('lyricscontainer')) {
    // Same video id and same theme and lyrics are showing -> stop here
    return
  }
  lastVideoId = tmpVideoId

  let isMusic = false
  let ytdDescriptionInfo = null
  let videoTitle = null
  let genre = null
  let isFamilySafe = null

  if (ytdAppData) {
    ytdDescriptionInfo = getMusicTitleAndAuthor(ytdAppData)
    if (ytdDescriptionInfo !== null) {
      isMusic = true
    }
    // videoTitle
    try {
      videoTitle = getSimpleText(ytdAppData.playerResponse.microformat.playerMicroformatRenderer.title)
    } catch (e) {
      videoTitle = h1.textContent.toLowerCase()
    }
    // genre
    try {
      genre = ytdAppData.playerResponse.microformat.playerMicroformatRenderer.category
    } catch (e) {}
  }
  if (typeof videoTitle !== 'string') {
    return
  }

  console.log(`Youtube Genius Lyrics - Genre "${genre}" is found`)
  if (ytdDescriptionInfo === null) {
    if (genre === 'Music') {
      isMusic = true;
    }
  }

  // isFamilySafe
  try {
    isFamilySafe = ytdAppData.playerResponse.microformat.playerMicroformatRenderer.isFamilySafe
  } catch (e) {}
  if (isFamilySafe === false) return

  if (force) {
    isMusic = true
    lastForceVideoId = lastVideoId
  } else if (isMusic === false && (lastForceVideoId === null || lastForceVideoId !== lastVideoId)) {
    hideLyricsWithMessage()
    return
  }

  const { songTitle, songArtistsArr } = (ytdDescriptionInfo === null)
    ? traditionalYtdDescriptionInfo(videoTitle, videoDetails)
    : newYtdDescriptionInfo(ytdDescriptionInfo)
  const musicIsPlaying = isYoutubeVideoPlaying()
  genius.f.loadLyrics(force, beLessSpecific, songTitle, songArtistsArr, musicIsPlaying)
}

let lastPos = null
function updateAutoScroll (video) {
  let pos = null
  if (!video) {
    video = getYoutubeMainVideo()
  }
  if (video) {
    pos = video.currentTime / video.duration
  }
  if (pos !== null && pos >= 0 && lastPos !== pos) {
    lastPos = pos
    genius.f.scrollLyrics(pos)
  }
}

function showSearchField (query) {
  const spanLabel = document.createElement('span')
  spanLabel.classList.add('youtube-genius-lyrics-search-container-label')
  spanLabel.textContent = 'Search genius.com: '

  const input = document.createElement('input')
  input.className = 'SearchInputBox__input'
  input.placeholder = 'Search genius.com...'

  const span = document.createElement('span')
  span.classList.add('youtube-genius-lyrics-search-container-span')
  span.textContent = ' \uD83D\uDD0D'

  // Hide button
  const hideButton = document.createElement('span')
  hideButton.classList.add('youtube-genius-lyrics-search-container-hide-btn')
  hideButton.title = 'Hide'
  hideButton.textContent = '\uD83C\uDD87'
  hideButton.addEventListener('click', function hideButtonClick (ev) {
    hideLyricsWithMessage()
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
    if (ev.code === 'Enter') {
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

  // flush DOM
  const b = getCleanLyricsContainer()
  b.classList.add('youtube-genius-lyrics-search-container')
  document.documentElement.setAttribute('youtube-genius-lyrics-container', 'search')
  appendElements(b, [
    spanLabel,
    input,
    span,
    hideButton
  ])
  document.body.appendChild(b)

  /* eslint-disable no-new */
  new Promise(() => {
    input.focus()
  })
}

function setupLyricsDisplayDOM (song, searchresultsLengths) {
  // getCleanLyricsContainer
  const container = getCleanLyricsContainer()
  container.className = '' // custom.getCleanLyricsContainer might forget to clear the className if the element is reused
  container.classList.add('genius-lyrics-result-shown')

  if (typeof genius.f.isGreasemonkey === 'function' && genius.f.isGreasemonkey()) {
    container.innerHTML = '<h2>This script only works in <a target="_blank" href="https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/">Tampermonkey</a></h2>Greasemonkey is no longer supported because of this <a target="_blank" href="https://github.com/greasemonkey/greasemonkey/issues/2574">bug greasemonkey/issues/2574</a> in Greasemonkey.'
    return
  }

  let elementsToBeAppended = []

  let separator = document.createElement('span')
  separator.setAttribute('class', 'second-line-separator')
  separator.setAttribute('style', 'padding:0px 3px')
  separator.textContent = '•'

  const bar = document.createElement('div')
  bar.setAttribute('class', 'lyricsnavbar')
  bar.style.fontSize = '0.7em'
  bar.style.userSelect = 'none'

  /*
  // Resize button
  if ('initResize' in custom) {
    const resizeButton = document.createElement('span')
    resizeButton.style.fontSize = '1.8em'
    resizeButton.style.cursor = 'ew-resize'
    resizeButton.textContent = '⇹'
    resizeButton.addEventListener('mousedown', custom.initResize)
    elementsToBeAppended.push(resizeButton, separator.cloneNode(true))
  }
  */

  // Hide button
  const hideButton = document.createElement('span')
  hideButton.classList.add('genius-lyrics-hide-button')
  hideButton.style.cursor = 'pointer'
  hideButton.textContent = 'Hide'
  hideButton.addEventListener('click', function hideButtonClick (ev) {
    genius.option.autoShow = false // Temporarily disable showing lyrics automatically on song change
    if (genius.iv.main > 0) {
      clearInterval(genius.iv.main)
      genius.iv.main = 0
    }
    hideLyricsWithMessage()
  })
  elementsToBeAppended.push(hideButton, separator.cloneNode(true))

  // Config button
  const configButton = document.createElement('span')
  configButton.classList.add('genius-lyrics-config-button')
  configButton.style.cursor = 'pointer'
  configButton.textContent = 'Options'
  configButton.addEventListener('click', function configButtonClick (ev) {
    genius.f.config()
  })
  elementsToBeAppended.push(configButton)

  if (searchresultsLengths === 1) {
    // Wrong lyrics button
    const wrongLyricsButton = document.createElement('span')
    wrongLyricsButton.classList.add('genius-lyrics-wronglyrics-button')
    wrongLyricsButton.style.cursor = 'pointer'
    wrongLyricsButton.href = '#'
    wrongLyricsButton.textContent = 'Wrong lyrics'
    wrongLyricsButton.addEventListener('click', function wrongLyricsButtonClick (ev) {
      removeElements(document.querySelectorAll('.loadingspinnerholder'))
      // forgetLyricsSelection(genius.current.title, genius.current.artists, this.dataset.hit)
      genius.f.forgetLyricsSelection(genius.current.title, genius.current.artists)
      showSearchField(`${genius.current.artists} ${genius.current.title}`)
    })
    elementsToBeAppended.push(separator.cloneNode(true), wrongLyricsButton)
  } else if (searchresultsLengths > 1) {
    // Back button
    const backbutton = document.createElement('span')
    backbutton.classList.add('genius-lyrics-back-button')
    backbutton.style.cursor = 'pointer'
    // searchresultsLengths === true is always false for searchresultsLengths > 1
    // if (searchresultsLengths === true) {
    //  backbutton.textContent = 'Back to search results'
    // } else {
    backbutton.textContent = `Back to search (${searchresultsLengths - 1} other result${searchresultsLengths === 2 ? '' : 's'})`
    // }
    backbutton.addEventListener('click', function backbuttonClick (ev) {
      custom.showSearchField(genius.current.artists + ' ' + genius.current.title)
    })
    elementsToBeAppended.push(separator.cloneNode(true), backbutton)
  }

  const iframe = document.createElement('iframe')
  iframe.id = 'lyricsiframe'
  iframe.style.opacity = 0.1

  // clean up
  separator = null

  // flush to DOM tree
  appendElements(bar, elementsToBeAppended)
  appendElements(container, [bar, iframe])

  // clean up
  elementsToBeAppended.length = 0
  elementsToBeAppended = null

  return {
    container,
    bar,
    iframe
  }
}

function getHitOfElement (li) {
  if (!li || li.nodeType !== 1 || !hitMaps) {
    return null
  }
  return hitMaps.get(li) || null
}

async function rememberLyricsSelection (title, artists, hit) {
  // in order to call "genius.f.rememberLyricsSelection(title, artists, jsonHit)", use async call to get jsonHit
  /* eslint-disable no-new */
  const jsonHit = await new Promise(function (resolve) {
    // this is not a complete async function, but it helps not to block the scripting
    resolve(JSON.stringify(hit))
  })
  genius.f.rememberLyricsSelection(title, artists, jsonHit)
}

function listSongs (hits, container, query) {
  // Back to search button
  const backToSearchButton = document.createElement('span')
  backToSearchButton.classList.add('youtube-genius-lyrics-results-container-back-btn')
  backToSearchButton.textContent = 'Back to search'
  backToSearchButton.addEventListener('click', function backToSearchButtonClick (ev) {
    if (query) {
      showSearchField(query)
    } else if (genius.current.artists) {
      showSearchField(genius.current.artists + ' ' + genius.current.title)
    } else {
      showSearchField()
    }
  })

  const separator = document.createElement('span')
  separator.classList.add('second-line-separator')
  separator.classList.add('youtube-genius-lyrics-second-line-separator')
  separator.textContent = '•'

  // Hide button
  const hideButton = document.createElement('span')
  hideButton.classList.add('youtube-genius-lyrics-results-container-hide-btn')
  hideButton.textContent = 'Hide'
  hideButton.addEventListener('click', function hideButtonClick (ev) {
    hideLyricsWithMessage()
  })

  // List search results
  const tracklistOL = document.createElement('ol')
  tracklistOL.classList.add('tracklist')
  tracklistOL.classList.add('youtube-genius-lyrics-tracklist')
  tracklistOL.addEventListener('click', function onclick (ev) {
    const element = ev.target
    if (element.nodeName === 'LI') {
      const hit = getHitOfElement(element)
      if (hit !== null) {
        genius.f.showLyrics(hit, searchresultsLengths)
        rememberLyricsSelection(title, artists, hit)
      }
    }
  }, true)

  // cache the required information
  const searchresultsLengths = hits.length
  const title = genius.current.title
  const artists = genius.current.artists

  // prepare results
  const liArr = hits.map(function hitsMap (hit) {
    const li = document.createElement('li')
    li.classList.add('youtube-genius-lyrics-result')
    const trackhtml = `
    <div style="float:left;">
      <div class="onhover"><span>🅖</span></div>
      <div class="onout"><span>📄</span></div>
    </div>
    <div style="float:left; margin-left:5px">${hit.result.primary_artist.name} • ${hit.result.title_with_featured} <br><span style="font-size:0.7em">👁 ${genius.f.metricPrefix(hit.result.stats.pageviews, 1)} ${hit.result.lyrics_state}</span></div>
    <div style="clear:left;"></div>`
    li.innerHTML = trackhtml
    if (!hitMaps) {
      hitMaps = new WeakMap()
    }
    hitMaps.set(li, hit)
    return li
  })
  appendElements(tracklistOL, liArr)

  // Flush DOM
  if (!container) {
    container = getCleanLyricsContainer()
  } else {
    container.className = ''
  }
  container.classList.add('youtube-genius-lyrics-results-container')
  document.documentElement.setAttribute('youtube-genius-lyrics-container', 'results')
  container.innerHTML = ''
  appendElements(container, [
    backToSearchButton,
    separator,
    hideButton,
    tracklistOL
  ])
}

function loremIpsum () {
  const classText = ['<span class="gray">', '</span>']
  const classWhitespace = ['<span class="white">', '</span>']
  const random = (x) => 1 + parseInt(Math.random() * x)
  let text = ''
  const loopM = [Math.max(3, random(5)), random(6), random(9), 1 + random(10), 1 + random(7)]
  for (let v = 0; v < loopM[0]; v++) {
    for (let b = 0; b < loopM[1]; b++) {
      const line = []
      for (let l = 0; l < loopM[2]; l++) {
        for (let w = 0; w < loopM[3]; w++) {
          for (let i = 0; i < loopM[4]; i++) {
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
  lyricsDisplayState = 'loading'
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
      window.setTimeout(resizeSpinner, 1000)
    }
  }
  window.setTimeout(resizeSpinner, 1000)

  return spinner
}

function iframeLoadedCallback1 (res) {
  lyricsDisplayState = 'loaded'
}

function iframeLoadedCallback2 (res) {
  // nothing
}

function main () {
  if (lyricsDisplayState === 'loading') {
    // avoid iframe communcation error
    return
  }
  /*
  if (document.getElementById('lyricscontainer') || document.getElementById('showlyricsbutton')) {

  }
  */
  if (!document.querySelector('ytd-watch-flexy #container .title')) {
    return
  }
  if (genius.option.autoShow) {
    addLyrics()
  } else {
    addLyricsButton()
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

    const h2 = container.appendChild(document.createElement('h2'))
    h2.textContent = '⚠️ Youtube Genius Lyrics 🆕'
    const p = container.appendChild(document.createElement('p'))
    p.textContent = '▶️ If you would like to see lyrics here as well, you can now install a new userscript specifically for music.youtube.com:'
    p.appendChild(document.createElement('br'))
    p.appendChild(document.createElement('br'))

    const aSource = p.appendChild(document.createElement('a'))
    aSource.target = '_blank'
    aSource.href = 'https://openuserjs.org/scripts/cuzi/Youtube_Music_Genius_Lyrics'
    aSource.textContent = '📑 https://openuserjs.org/scripts/cuzi/Youtube_Music_Genius_Lyrics'

    p.appendChild(document.createElement('br'))
    p.appendChild(document.createElement('br'))

    const aInstall = p.appendChild(document.createElement('a'))
    aInstall.href = 'https://openuserjs.org/install/cuzi/Youtube_Music_Genius_Lyrics.user.js'
    aInstall.textContent = '💘 Click to install new script'
    aInstall.addEventListener('click', function () {
      GM.setValue('newapphint', -1).then(function () {
        aInstall.innerHTML = 'ℹ️ Please reload (F5) the page after installing'
      })
    })

    p.appendChild(document.createElement('br'))
    p.appendChild(document.createElement('br'))

    const remindMeLater = container.appendChild(document.createElement('button'))
    remindMeLater.textContent = '🔜 Remind me later'
    remindMeLater.addEventListener('click', function () {
      GM.setValue('newapphint', 1).then(() => container.remove())
    })

    container.appendChild(document.createElement('br'))

    const doNotShowAgain = container.appendChild(document.createElement('button'))
    doNotShowAgain.textContent = '🆗🆒 Do not show again'
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
  const isRobotsTxt = document.location.href.indexOf('robots.txt') >= 0
  const setupMain = isRobotsTxt
    ? function setupMain () {
      // do nothing
    }
    : function setupMain () {
      window.setTimeout(main, 600)
      document.removeEventListener('yt-navigate-finish', main, false)
      document.addEventListener('yt-navigate-finish', main, false)
    }

  // should it be required for robots.txt as well?? can remove??
  genius = geniusLyrics({
    GM,
    scriptName: SCRIPT_NAME,
    scriptIssuesURL: 'https://github.com/cvzi/Youtube-Genius-Lyrics-userscript/issues',
    scriptIssuesTitle: 'Report problem: github.com/cvzi/Youtube-Genius-Lyrics-userscript/issues',
    domain: 'https://www.youtube.com/',
    emptyURL: 'https://www.youtube.com/robots.txt',
    main,
    setupMain,
    addCss,
    getHitOfElement,
    listSongs,
    showSearchField,
    setupLyricsDisplayDOM,
    addLyrics,
    hideLyrics,
    getCleanLyricsContainer,
    setFrameDimensions,
    onResize,
    createSpinner,
    iframeLoadedCallback1,
    iframeLoadedCallback2
  })
  if (isRobotsTxt === false) {
    GM.registerMenuCommand(SCRIPT_NAME + ' - Show lyrics', () => addLyrics(true))

    function videoTimeUpdate (ev) {
      if (genius.f.isScrollLyricsEnabled()) {
        if ((ev || 0).target.nodeName === 'VIDEO') updateAutoScroll()
      }
    }
    document.addEventListener('genius-lyrics-actor', (ev) => {
      const detail = (ev || 0).detail
      const action = (detail || 0).action || ''
      if (action === 'hideLyrics') {
        hideLyricsWithMessage()
      } else if (action === 'showLyrics') {
        showLyricsButtonClicked()
      }
    })
    window.addEventListener('message', function (e) {
      const data = ((e || 0).data || 0)
      if (data.iAm === SCRIPT_NAME && data.type === 'lyricsDisplayState') {
        let isScrollLyricsEnabled = false
        if (data.visibility === 'loaded' && data.lyricsSuccess === true) {
          isScrollLyricsEnabled = genius.f.isScrollLyricsEnabled()
        }
        lyricsDisplayState = data.visibility
        if (isScrollLyricsEnabled === true) {
          document.addEventListener('timeupdate', videoTimeUpdate, true)
        } else {
          document.removeEventListener('timeupdate', videoTimeUpdate, true)
        }
      }
    })
    document.addEventListener('play', function (ev) {
      if (((ev || 0).target || 0).nodeName === 'VIDEO' && ev.target.matches('#movie_player video[src]')) {
        if (lyricsDisplayState === 'hidden') {
          window.setTimeout(main, 600)
        }
      }
    }, true)
    document.documentElement.classList.add('youtube-genius-lyrics')
  }
}
