/* Tartarus — the music
   Four playlists of lofi, downloaded from Pixabay and kept in
   static/audio — one flat folder, since a track can be on two of them.
   Each playlist is always shuffled, and one `Audio` element plays the
   lot: the tube only ever describes what it is doing, so the sound
   survives the tube being dragged, and the timer running underneath it.

   Loaded after timer.js, and named clear of it and of graph.js — the
   scripts share the one page scope. */

const tunes = {
    card: $('music'), tool: $('audio'), toolIcon: $('audio-icon'),
    name: $('list-name'), title: $('track-title'), by: $('track-by'),
    seek: $('seek'), at: $('track-at'), len: $('track-len'), line: $('music-line'),
    play: $('track-play'), playIcon: $('play-icon'),
};

/* Each track: what it is called, who made it, the file it is in, and the
   length Pixabay gives for it — shown until the file itself says
   otherwise. A track on two playlists is one file, named as Pixabay
   names it, so nothing is downloaded twice. */
const LISTS = [
    {
        name: 'Cozy',
        tracks: [
            ['Dreamy Meadow', 'LofCosmos', 'dreamy-meadow-157900', 257],
            ['Lofi Study - Calm Peaceful Chill Hop', 'FASSounds', 'lofi-study-calm-peaceful-chill-hop-112191', 147],
            ['Vintage Memories', 'LofCosmos', 'vintage-memories-157897', 320],
            ['Lo-Fi Summer Relax HipHop', 'Noobehouse', 'lo-fi-summer-relax-hiphop-156249', 91],
            ['Lo-Fi Chillhop Beat Background Music', 'Music_Unlimited', 'lo-fi-chillhop-beat-background-music-133473', 137],
            ['Chillhop Beat "Thousand Miles"', 'Music_Unlimited', 'chillhop-beat-quotthousand-milesquot-113254', 115],
            ['Desert Island', 'SoulProdMusic', 'desert-island-156043', 141],
            ['Fleeting Memory', 'SergePavkinMusic', 'fleeting-memory-156195', 272],
            ['Spectacular Sunset', 'SergePavkinMusic', 'spectacular-sunset-156597', 248],
            ['Close / Study Relax ChillHop', 'SoulProdMusic', 'close-study-relax-chillhop-calm-study-lofi-123089', 135],
            ['Avenue (LoFi)', 'xethrocc', 'avenue-lofi-154343', 442],
            ['Warm Twilight', 'SergePavkinMusic', 'warm-twilight-156924', 262],
            ['Focus', 'FASSounds', 'focus-154291', 128],
            ['LoFi Chill', 'BoDleasons', 'lofi-chill-129909', 78],
            ['Puddles in the Sky', 'chill_background', 'puddles-in-the-sky-142581', 174],
            ['Night Coffee Shop', 'Lofi_hour', 'night-coffee-shop-114856', 157],
            ['Rain Café Lo-fi', 'Chill_Theater', 'rain-cafe-lo-fi-120915', 258],
            ['Lo-Fi Urban', '_Music_for_Creators_', 'lo-fi-urban-156196', 184],
            ['Radar', 'chill_background', 'radar-142575', 123],
            ['Sunset', 'FASSounds', 'sunset-154292', 88],
            ['Lo-Fi Midnight Hip Hop', 'Grand_Project', 'lo-fi-midnight-hip-hop-131723', 153],
            ['Night Street', 'chill_background', 'night-street-142577', 172],
            ['The Last Train', 'Lofi_hour', 'the-last-train-122342', 158],
            ['Chill Abstract', 'NverAvetyanMusic', 'chill-abstract-background-music-154682', 135],
        ],
    },
    {
        name: 'Jazzy',
        tracks: [
            ['Lo-fi Room', '_Yasuko_', 'lo-fi-room-206488', 320],
            ['Late Night Whispers', 'LofCosmos', 'late-night-whispers-lofi-288014', 240],
            ['Jazzy Life', 'AmsleyBeats', 'jazzy-life-moody-lofi-beat-260942', 256],
            ['Gentle Breeze', 'LofCosmos', 'gentle-breeze-lofi-156771', 297],
            ['Golden Hour Harmony', 'Nikoo1', 'free-lofi-type-beat-golden-hour-harmony-209519', 283],
            ['Fog', '14584889', 'chill-lofi-hip-hop-type-beat-fog-211509', 298],
            ['Warm Nights', 'xethrocc', 'warm-nights-196465', 330],
            ['Starlit Skies', 'Nikoo1', 'free-lofi-type-beat-starlit-skies-209513', 253],
            ['Lofi Slow Raining', 'AllWorldMusic', 'lofi-slow-raining-259042', 240],
            ['Chillax Under the Stars', 'Nikoo1', 'free-lofi-type-beat-chillax-under-the-stars-209518', 283],
            ['Night Sky', 'LofCosmos', 'night-sky-lofi-156772', 240],
            ['Unwritten Dreams', 'tramp963', 'unwritten-dreams-lo-fi-music-265071', 240],
            ['Starry Night', 'snoozybeats', 'relaxing-lofi-beat-quotstarry-nightquot-228759', 244],
            ['Radio 28', 'bluelike_u', '4-radio-28-lofi-chill-248700', 240],
            ['Lost in Tokyo', 'LofiVision', 'lost-in-tokyo-242003', 240],
            ['Evening Shore', 'SergePavkinMusic', 'evening-shore-190014', 291],
            ['City Streets', 'LofCosmos', 'city-streets-lofi-156769', 283],
            ['Bajo la Luz de Neón', 'LofCosmos', 'bajo-la-luz-de-neon-1-247379', 240],
            ['Moonlit Serenity', 'Nikoo1', 'free-lofi-type-beat-moonlit-serenity-209900', 303],
            ['Lonely Skyline Reflections', 'RibhavAgrawal', 'lonely-skyline-reflections-lofi-beats-281207', 302],
            ['Fading Sunbeams', 'Free_Audio_Library', 'lo-fi-chill-background-music-fading-sunbeams-309854', 240],
            ['Brain Power', 'Asanka_Design', 'brain-power-music-by-asankadesign-258895', 240],
            ['Rain Café Lo-fi', 'Chill_Theater', 'rain-cafe-lo-fi-120915', 258],
            ['Far From Here', 'snoozybeats', 'far-from-here-309609', 240],
            ['Relax With My Cat', 'babymeow', 'relax-with-my-cat-304131', 240],
            ['Retro Dreams', 'Nikoo1', 'free-lofi-type-beat-retro-dreams-209512', 309],
            ['Vintage Memories', 'LofCosmos', 'vintage-memories-157897', 320],
            ['Café Vibes', 'Stockaudios', 'lofi-cafe-vibes-306213', 259],
            ['Hazy Memory Tides', 'RibhavAgrawal', 'hazy-memory-tides-lofi-beats-281204', 264],
            ['Lullaby for Strangers', 'RibhavAgrawal', 'lullaby-for-strangers-lofi-beats-281208', 308],
            ['Cigarettes and Rain', 'RibhavAgrawal', 'cigarettes-and-rain-lofi-beats-281205', 288],
            ['Midnight Coffee Blues', 'RibhavAgrawal', 'midnight-coffee-blues-lofi-beats-281196', 256],
            ['Night Cafe Vibes', 'LofCosmos', 'night-cafe-vibes-1-lofi-275379', 240],
            ['Calm Coffee', 'abdipr', 'calm-coffee-chill-lo-fi-255503', 240],
            ['Dreamy Meadow', 'LofCosmos', 'dreamy-meadow-157900', 257],
            ['In a Cloud of Daydreams', 'LofCosmos', 'in-a-cloud-of-daydreams-lofi-288013', 240],
            ['Lofi Large', 'LofCosmos', 'lofi-large-lofi-254376', 240],
            ['Lofi Chill Melancholic', 'AllWorldMusic', 'lofi-chill-melancholic-259764', 240],
            ['Sleepless Sky Stroll', 'RibhavAgrawal', 'sleepless-sky-stroll-lofi-beats-281209', 309],
            ['Under the Clock', 'RibhavAgrawal', 'under-the-clock-lo-fi-beats-music-303918', 240],
            ['Lanterns in Fog', 'RibhavAgrawal', 'lanterns-in-fog-lofi-beats-281201', 266],
            ['Waves of Solitude', 'RibhavAgrawal', 'waves-of-solitude-lofi-beats-281203', 272],
            ['Melancholy Moon Vibes', 'RibhavAgrawal', 'melancholy-moon-vibes-lofi-beats-281210', 319],
            ['Fading Neon Lights', 'RibhavAgrawal', 'fading-neon-lights-lofi-beats-281197', 259],
            ['Dreaming Through Dusk', 'RibhavAgrawal', 'dreaming-through-dusk-lofi-beats-281206', 278],
            ['Night Waves', 'TheBoysBeats', 'lofi-boy-night-waves-lofi-relax-instrumental-278248', 240],
            ['Lo-fi Vibes', 'Denis-Pavlov-Music', 'lo-fi-vibes-chillout-relax-podcast-music-309667', 276],
            ['Coverless Book', 'AmbientAUDIOVISION', 'coverless-book-lofi-186307', 264],
            ['Whispering Vinyl Loops', 'RibhavAgrawal', 'whispering-vinyl-loops-lofi-beats-281193', 240],
            ['Moving On', 'snoozybeats', 'moving-on-lofi-309231', 240],
        ],
    },
    {
        name: 'Dreamy',
        tracks: [
            ['Lo-Fi (loop)', 'Amaksi', 'lo-fi-loop-149702', 168],
            ['Lo-Fi Chilled', 'NverAvetyanMusic', 'lo-fi-chilled-147552', 128],
            ['Unpacking', 'SoulProdMusic', 'unpacking-loop-ycle-138250', 126],
            ['Soul Hip Hop Music', 'NverAvetyanMusic', 'soul-hip-hop-music-150201', 128],
            ['Walk', 'Sup3rrr', 'walk-124289', 84],
            ['Just Chill', 'Lofi_hour', 'just-chill-114854', 122],
            ['Next Tuesday', 'DayFox', 'next-tuesday-122591', 204],
            ['R\'n\'B 120 BPM', 'KlemLoden', 'rx27nx27b-120-bpm-153737', 192],
            ['Gallows', 'IsaiahMathew', 'gallows-isaiah-mathew-154725', 262],
            ['Chillout Meditation', 'Music_Unlimited', 'chillout-meditation-hip-hop-background-music-152971', 85],
            ['At Last', 'IsaiahMathew', 'at-last-isaiah-mathew-154731', 171],
            ['Lounge', 'saavane', 'sexy-lounge-music-131701', 135],
            ['Chill Hop', 'gudsounds', 'chill-hop-141886', 118],
            ['Cupcake', 'SoulProdMusic', 'cupcake-140380', 120],
            ['Melon Juice', 'DayFox', 'melon-juice-122590', 184],
            ['Artic Chill', 'LofiLaMar', 'artic-chill-140674', 212],
            ['Audio Pon', 'Magiksolo', 'audio-pon-125998', 126],
            ['Chinese Lo-Fi Hip Hop', 'NverAvetyanMusic', 'chinese-lo-fi-hip-hop-132592', 120],
            ['Lo Fi Chill', '_Music_for_Creators_', 'lo-fi-chill-128218', 152],
            ['Night Routine', 'The_Mountain', 'night-routine-132371', 112],
            ['Lo-Fi Hip-Hop', 'penguinmusic', 'lo-fi-hip-hop-139184', 102],
            ['Outside', 'Coma-Media', 'outside-133067', 123],
            ['ChillHop', 'SoulProdMusic', 'chillhop-149098', 157],
            ['Japan', 'Alex-Productions', 'japan-129339', 152],
            ['Trumpet Lofi', 'Haletski', 'trumpet-lofi-141049', 245],
            ['Pollen', 'Coma-Media', 'pollen-140222', 116],
            ['LoFi Lounge Hip-Hop', 'penguinmusic', 'lofi-lounge-hip-hop-143260', 75],
            ['Lo-Fi Happy', 'Nesterouk', 'lo-fi_happy-147150', 95],
            ['Dream 04: Soon Fool Moon', 'VLS1983', 'dream-04-soon-fool-moon-151644', 203],
        ],
    },
    {
        name: 'Upbeat',
        tracks: [
            ['Night Street', 'Ashot_Danielyan', 'night-street-relaxed-vlog-131746', 141],
            ['Fashion Vlog', 'FASSounds', 'lofi-chill-commercial-fashion-vlog-140858', 125],
            ['Weeknds', 'DayFox', 'weeknds-122592', 209],
            ['Youth Vlog', 'The_Mountain', 'youth-vlog-158078', 100],
            ['Chilled Hop', 'NverAvetyanMusic', 'chilled-hop-calm-chill-background-157538', 135],
            ['Aesthetics', 'SoulProdMusic', 'aesthetics-138637', 126],
            ['Lofi Summer', 'raspberrymusic', 'lofi-summer-background-112369', 134],
            ['Retro Hip Hop', 'NverAvetyanMusic', 'retro-hip-hop-147555', 132],
            ['Casset Gold', 'ColorfulSound', 'casset-gold-157731', 135],
            ['Lofi Beat', 'FASSounds', 'lofi-beat-140856', 131],
            ['After Party', 'SoulProdMusic', 'after-party-144155', 122],
            ['Ice Cream Toast', 'FASSounds', 'ice-cream-toast-156583', 120],
            ['Lofi In The Bank', 'BrentinDavis', 'lofi-in-the-bank-115135', 244],
            ['Soft LoFi Vintage', 'ComaStudio', 'soft-lofi-beat_vintage-95425', 97],
            ['Breath Of Asia', 'raspberrymusic', 'breath-of-asia-158105', 102],
            ['Jazz Cafe', 'FASSounds', 'jazz-cafe-112190', 123],
            ['Chill Embrace', 'QubeSounds', 'chill_embrace-155967', 82],
            ['Chillhop Lo-Fi Hip-Hop Beat', 'Music_Unlimited', 'chillhop-lo-fi-hip-hop-beat-background-music-133472', 121],
            ['R&B', 'Music_For_Videos', 'rampb-129648', 78],
            ['Restart', 'SoulProdMusic', 'restart-chillhop-background-music-157632', 133],
            ['This Way', 'Music_Unlimited', 'quotthis-wayquot-hip-hop-beat-113255', 139],
            ['Fly', '11dot21', 'fly-chill-beats-copyright-issue-153440', 163],
            ['Awaken', 'Melodigne', 'awaken-157347', 152],
            ['Lo-Fi Hip Hop', 'NverAvetyanMusic', 'lo-fi-hip-hop-emotional-amp-chill-music-156547', 126],
            ['Cooking Beats', 'FASSounds', 'cooking-beats-154289', 139],
            ['Morning Coffee', 'SoundGalleryByDmitryTaras', 'morning-coffee-151668', 142],
            ['RNB Hip Hop', 'NverAvetyanMusic', 'rnb-hip-hop-149310', 130],
            ['Travel Vlog', 'SoundGalleryByDmitryTaras', 'travel-vlog-background-music-129058', 147],
            ['Thursday Afternoon', 'saavane', 'thursday-afternoon-laid-back-lofi-hip-hop-beat-148859', 168],
            ['Lofi Beat Chill', 'WATRFALLKERO', 'lofi-beat-chill-7373', 152],
        ],
    },
].map((list) => ({
    ...list,
    tracks: list.tracks.map(([title, by, file, secs]) => ({ title, by, file, secs })),
}));

/* Which playlist the last session was on. Not which track of it: the
   order is drawn fresh anyway. */
const spot = { list: 0, ...(prefs.tune ?? {}) };
spot.list = Math.min(Math.max(0, spot.list), LISTS.length - 1);

const player = new Audio();
player.preload = 'metadata';

/* Always shuffled, and shuffled as a bag rather than a die: the whole
   playlist is dealt into a random order and played down, so nothing
   comes round twice before everything has been heard once. The order is
   drawn again each time the end is reached. */
let bag = [];
let at = 0;

function deal() {
    bag = LISTS[spot.list].tracks.map((_, n) => n);
    for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    at = 0;
}

const listNow = () => LISTS[spot.list];
const trackNow = () => listNow().tracks[bag[at]];
const src = (track) => `/static/audio/${track.file}.mp3`;

/* ── Saying where it is ───────────────────────────────────── */

/* The length the file reports once it is known, and the one Pixabay
   printed until then — so the right-hand time is never empty. */
const full = () => (Number.isFinite(player.duration) ? player.duration : trackNow().secs);

function paint() {
    const track = trackNow();
    tunes.name.textContent = listNow().name;
    tunes.title.textContent = track.title;
    tunes.by.textContent = track.by;
    tunes.len.textContent = fmt(full() * 1000);
    showTime();
}

/* The bar and the clock, a few times a second while it plays. Dragging
   the bar takes it over, so the thumb does not fight the hand on it. */
let held = false;

function showTime() {
    const through = player.currentTime / (full() || 1);
    tunes.at.textContent = fmt(player.currentTime * 1000);
    tunes.line.style.setProperty('--p', through.toFixed(4));
    if (!held) tunes.seek.value = Math.round(through * 1000);
}

/* Playing or not, in three places: the key on the card, the speaker on
   the island, and the label a screen reader is given. */
function showKeys() {
    const going = !player.paused;
    tunes.playIcon.setAttribute('href', going ? '#i-pause' : '#i-play');
    tunes.play.setAttribute('aria-label', going ? 'Pause' : 'Play');
    tunes.play.classList.toggle('is-running', going);
    tunes.toolIcon.setAttribute('href', going ? '#i-volume' : '#i-mute');
    tunes.tool.classList.toggle('is-on', showing(tunes.card));
}

/* ── Working the player ───────────────────────────────────── */

/* Loading a track keeps whatever the player was doing: stepping through
   a playlist while it is going should not stop the music, and stepping
   through it while it is stopped should not start it. */
function load(playing = !player.paused) {
    player.src = src(trackNow());
    player.currentTime = 0;
    paint();
    if (playing) start();
    else showKeys();
    remember();
}

function start() {
    player.play().then(showKeys).catch(showKeys); /* a tab that will not play yet */
}

function toTrack(by) {
    at += by;
    if (at >= bag.length) deal();       /* heard the lot: draw the order again */
    else if (at < 0) at = bag.length - 1;
    load();
}

function turn(by) {
    spot.list = (spot.list + by + LISTS.length) % LISTS.length;
    deal();
    load();
}

function showMusic(on) {
    reveal(tunes.card, on, 350);
    if (on) {
        raise(tunes.card);
        if (!player.src) load(false);
        start();
    } else {
        player.pause();
    }
    showKeys();
}

let pending = null;

function remember() {
    clearTimeout(pending);
    pending = setTimeout(() => {
        prefs.tune = { list: spot.list };
        save();
    }, 600);
}

/* ── Wiring ───────────────────────────────────────────────── */

/* The tube has no head to grab: it is picked up anywhere that is not a
   key, like the island itself. */
draggable(tunes.card, 'music');
cards.set(tunes.card, showMusic);

tunes.tool.addEventListener('click', () => showMusic(!showing(tunes.card)));
$('music-close').addEventListener('click', () => showMusic(false));

tunes.play.addEventListener('click', () => {
    if (!player.src) load(false);
    if (player.paused) start();
    else { player.pause(); showKeys(); }
});

$('track-prev').addEventListener('click', () => toTrack(-1));
$('track-next').addEventListener('click', () => toTrack(1));
$('list-prev').addEventListener('click', () => turn(-1));
$('list-next').addEventListener('click', () => turn(1));

/* Scrubbing: the bar leads while it is held, and the player follows on
   the way down — so dragging it does not stutter the sound. */
tunes.seek.addEventListener('pointerdown', (e) => { held = true; e.stopPropagation(); });
tunes.seek.addEventListener('input', () => {
    held = true;
    tunes.at.textContent = fmt((tunes.seek.value / 1000) * full() * 1000);
});
tunes.seek.addEventListener('change', () => {
    player.currentTime = (tunes.seek.value / 1000) * full();
    held = false;
});

/* A file that will not play is stepped over rather than left sitting
   there — but only as far as once round the bag, so a folder that is
   not there cannot spin the player. */
let stumbles = 0;

player.addEventListener('error', () => { if (stumbles++ < bag.length) toTrack(1); });
player.addEventListener('playing', () => { stumbles = 0; });
player.addEventListener('timeupdate', showTime);
player.addEventListener('loadedmetadata', paint);
player.addEventListener('ended', () => toTrack(1));
player.addEventListener('play', showKeys);
player.addEventListener('pause', showKeys);

deal();
paint();
showKeys();
