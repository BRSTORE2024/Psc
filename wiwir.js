const puppeteer = require("puppeteer"),
    readline = require("readline"),
    fs = require("fs"),
    path = require("path"),
    AKUN_FILE = "akun.txt",
    PSC_FILE = "paysafecard.txt",
    SUCCESS_FILE = "success.txt",
    ALREADY_FILE = "already.txt",
    DELAY_MS = {
        min: 800,
        max: 2e3
    },
    TWO_FA_TIMEOUT = 3e5,
    EXTENSION_NAMES = ["buster"],
    EXTENSIONS = EXTENSION_NAMES.map(a => path.join(__dirname, "extensions", a)),
    sleep = a => new Promise(e => setTimeout(e, a)),
    randDelay = () => sleep(Math.random() * (DELAY_MS.max - DELAY_MS.min) + DELAY_MS.min);

function log(a, e = "INFO", t = "") {
    const i = (new Date).toLocaleTimeString("id-ID"),
        o = t ? `[${t}] ` : "";
    console.log(`[${i}] ${{INFO:"📋",OK:"✅",ERR:"❌",WAIT:"⏳",WARN:"⚠️"}[e]||"•"} ${o}${a}`)
}

function tanya(a) {
    const e = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise(t => e.question(a, a => {
        e.close(), t(a.trim())
    }))
}

function bacaFile(a) {
    return fs.existsSync(a) ? fs.readFileSync(a, "utf8").split("\n").map(a => a.trim()).filter(a => a.includes("|") && a.length > 3) : []
}

function simpanHasil(a, e) {
    fs.appendFileSync(e, a + "\n")
}

function hapusDariAkun(a) {
    const e = fs.readFileSync(AKUN_FILE, "utf8").split("\n");
    fs.writeFileSync(AKUN_FILE, e.filter(e => e.trim() !== a.trim()).join("\n"))
}
async function launchBrowser() {
    const a = [];
    return EXTENSIONS.length > 0 && (a.push(`--load-extension=${EXTENSIONS.join(",")}`), a.push(`--disable-extensions-except=${EXTENSIONS.join(",")}`)), puppeteer.launch({
        headless: !1,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1366,768", "--lang=id-ID", ...a],
        defaultViewport: {
            width: 1366,
            height: 768
        }
    })
}
async function patchBrowser(a) {}
async function ketikManusiawi(a, e, t) {
    await a.waitForSelector(e, {
        visible: !0,
        timeout: 15e3
    }), await a.click(e, {
        clickCount: 3
    }), await randDelay();
    for (const i of t) await a.type(e, i, {
        delay: 120 * Math.random() + 40
    })
}
async function handleSpeedbump(a, e = "") {
    try {
        a.url().includes("speedbump") && (log("Speedbump muncul! Klik confirm...", "WARN", e), await a.waitForSelector('input[name="confirm"]', {
            visible: !0,
            timeout: 8e3
        }), await a.click('input[name="confirm"]'), await a.waitForNavigation({
            waitUntil: "networkidle2",
            timeout: 2e4
        }), log("Speedbump selesai!", "OK", e))
    } catch (a) {}
}
async function loginGoogle(a, e, t, i = "") {
    if (log(`Login Google: ${e}`, "INFO", i), await a.goto("https://accounts.google.com/", {
            waitUntil: "networkidle2"
        }), await ketikManusiawi(a, "#identifierId", e), await randDelay(), await a.keyboard.press("Enter"), await a.waitForSelector('input[name="Passwd"]', {
            visible: !0,
            timeout: 2e4
        }), await randDelay(), await ketikManusiawi(a, 'input[name="Passwd"]', t), !await a.$eval('input[name="Passwd"]', a => a.value.length > 0)) throw new Error("Password tidak terisi!");
    if (log("Password terisi, submit...", "INFO", i), await randDelay(), await Promise.all([a.waitForNavigation({
            waitUntil: "networkidle2",
            timeout: 3e4
        }), a.keyboard.press("Enter")]), await handleSpeedbump(a, i), !a.url().includes("google.com")) throw new Error(`Login gagal, URL: ${a.url()}`);
    log("Login Google berhasil!", "OK", i)
}
async function loginGoogleBurst(a, e, t, i = "") {
    if (log(`Login Burst: ${e}`, "INFO", i), await a.goto(`https://accounts.google.com/signin/v2/identifier?Email=${encodeURIComponent(e)}`, {
            waitUntil: "networkidle2"
        }), await randDelay(), await Promise.all([a.waitForSelector('input[name="Passwd"]', {
            visible: !0,
            timeout: 2e4
        }), a.keyboard.press("Enter")]), await randDelay(), await ketikManusiawi(a, 'input[name="Passwd"]', t), !await a.$eval('input[name="Passwd"]', a => a.value.length > 0)) throw new Error("Password tidak terisi!");
    if (await randDelay(), await Promise.all([a.waitForNavigation({
            waitUntil: "networkidle2",
            timeout: 3e4
        }), a.keyboard.press("Enter")]), await handleSpeedbump(a, i), !a.url().includes("google.com")) throw new Error(`Login gagal, URL: ${a.url()}`);
    log("Login Google berhasil!", "OK", i)
}
async function logoutGoogle(a, e = "") {
    log("Logout...", "INFO", e), await a.goto("https://accounts.google.com/Logout?service=googleplay", {
        waitUntil: "networkidle2"
    }), await sleep(2e3), log("Logout selesai", "OK", e)
}
async function handleCaptcha(a, e = "") {
    await sleep(3e3);
    try {
        const t = await a.waitForSelector('iframe[src*="recaptcha/api2/bframe"]', {
            visible: !0,
            timeout: 8e3
        });
        log("CAPTCHA muncul! Menjalankan Buster...", "WAIT", e);
        const i = await t.contentFrame();
        await i.waitForSelector(".button-holder.help-button-holder", {
            timeout: 1e4
        }), await sleep(1e3);
        const o = async () => {
            const o = await t.boundingBox(),
                n = await i.evaluate(() => {
                    const a = document.querySelector(".button-holder.help-button-holder");
                    if (!a) return null;
                    const e = a.getBoundingClientRect();
                    return {
                        x: e.left + e.width / 2,
                        y: e.top + e.height / 2
                    }
                });
            if (!n || !o) throw new Error("Holder tidak ditemukan");
            const r = o.x + n.x,
                l = o.y + n.y;
            log(`Klik Buster di (${Math.round(r)}, ${Math.round(l)})`, "INFO", e), await a.mouse.move(r, l, {
                steps: 10
            }), await sleep(300), await a.mouse.click(r, l)
        };
        await o(), log("Buster diklik! Tunggu selesai...", "WAIT", e);
        for (let t = 1; t <= 5; t++) {
            const n = await Promise.race([a.waitForSelector(".auth-sca-challenge", {
                timeout: 3e4
            }).then(() => "solved"), (async () => {
                for (;;) {
                    await sleep(2e3);
                    try {
                        if ((await i.evaluate(() => {
                                const a = document.querySelector(".rc-audiochallenge-error-message");
                                return a ? a.innerText.trim() : ""
                            })).toLowerCase().includes("multiple correct")) return "retry"
                    } catch {}
                }
            })()]).catch(() => "timeout");
            if ("solved" === n) return log("CAPTCHA selesai! Halaman 2FA muncul.", "OK", e), void await sleep(1e3);
            if ("retry" !== n) return void log("CAPTCHA timeout, lanjut...", "WARN", e);
            log(`"Multiple correct solutions" — retry Buster (${t+1}/5)...`, "WARN", e), await sleep(1500), await o()
        }
    } catch (a) {
        log("Tidak ada CAPTCHA, lanjut...", "INFO", e)
    }
}
async function loginPSC(a, e, t, i = !1, o = "", n = null) {
    log("Menunggu window PaysafeCard...", "WAIT", o);
    const r = n || a.waitForTarget(a => a.url().startsWith("https://login.paysafecard.com/customer-auth/"), {
        timeout: 3e4
    });
    await r.catch(() => {}), await sleep(1e3);
    let l = null;
    for (let e = 0; e < 20; e++) {
        if (l = (await a.pages()).find(a => a.url().startsWith("https://login.paysafecard.com")) || null, l) break;
        await sleep(500)
    }
    if (!l) {
        const e = (await a.pages()).map(a => a.url());
        throw log(`Semua pages: ${JSON.stringify(e)}`, "ERR", o), new Error("Window PaysafeCard tidak ditemukan di browser.pages()!")
    }
    await patchBrowser(l), await l.waitForFunction(() => document.querySelector("#username") || document.querySelector("#password"), {
        timeout: 2e4
    }), await sleep(1e3);
    if (await l.$("#username").catch(() => null)) {
        await l.$eval("#username", a => a.value.length > 0).catch(() => !1) ? log("Email PSC sudah terisi, isi password saja...", "INFO", o) : (log("Isi email PSC...", "INFO", o), await ketikManusiawi(l, "#username", e), await randDelay())
    } else log("Form email tidak ada, langsung ke password...", "INFO", o);
    if (await l.waitForSelector("#password", {
            visible: !0,
            timeout: 1e4
        }), await ketikManusiawi(l, "#password", t), !await l.$eval("#password", a => a.value)) throw new Error("Password PSC tidak terisi!");
    if (!await l.$eval("#password", a => a.value)) throw new Error("Password PSC tidak terisi!");
    if (log("Klik Connect...", "INFO", o), await randDelay(), await l.click("#loginButton"), await handleCaptcha(l, o), i) log("Mode Burst: tidak perlu tap HP...", "INFO", o);
    else try {
        await l.waitForSelector(".auth-sca-challenge", {
            visible: !0,
            timeout: 1e4
        }), log("Halaman 2FA! Silakan tap notifikasi di HP (max 5 menit)...", "WAIT", o)
    } catch (a) {
        log("Halaman 2FA tidak terdeteksi, tunggu window PSC tertutup...", "WARN", o)
    }
    if (!await Promise.race([new Promise(e => {
            const t = setInterval(async () => {
                try {
                    (await a.pages()).some(a => a.url().startsWith("https://login.paysafecard.com")) || (clearInterval(t), e(!0))
                } catch {
                    clearInterval(t), e(!1)
                }
            }, 1e3)
        }), sleep(3e5).then(() => !1)])) throw new Error("Timeout! Window PSC tidak tertutup dalam 5 menit.");
    log("Window PSC tertutup!", "OK", o)
}
async function cekPSCSudahAda(a) {
    return (await a.$$eval(".IFOh3c", a => a.map(a => a.innerText)).catch(() => [])).some(a => /paysafecard\s*:\s*[•*]+/i.test(a))
}
async function tambahPaysafecard(a, e, t, i, o = !1, n = "") {
    if (log("Buka Google Play Payment Methods...", "INFO", n), await e.goto("https://play.google.com/store/paymentmethods", {
            waitUntil: "networkidle2"
        }), await randDelay(), await cekPSCSudahAda(e)) throw log("PaysafeCard sudah ada di akun ini, skip!", "WARN", n), new Error("ALREADY");
    log("Mencari tombol PaysafeCard...", "INFO", n), await e.waitForSelector(".HgYqic", {
        visible: !0,
        timeout: 2e4
    });
    const r = await e.evaluateHandle(() => {
        const a = Array.from(document.querySelectorAll(".HgYqic")).find(a => a.innerText.toLowerCase().includes("paysafecard"));
        return a ? a.closest("button") || a.closest('[role="button"]') || a : null
    });
    if (await e.evaluate(a => null === a, r)) throw new Error("Tombol PaysafeCard tidak ditemukan!");
    await r.click(), log("Klik Tambahkan Paysafecard", "OK", n), await randDelay(), log("Tunggu iframe modal...", "INFO", n), await e.waitForSelector('iframe[src*="instrument_manager"]', {
        visible: !0,
        timeout: 15e3
    }), await sleep(2e3);
    const l = await e.$('iframe[src*="instrument_manager"]'),
        s = await l.contentFrame();
    await s.waitForSelector(".submit-button.b3-primary-button", {
        visible: !0,
        timeout: 15e3
    }), await randDelay(), await s.click(".submit-button.b3-primary-button"), log("Klik Lanjutkan (iframe)", "OK", n), await loginPSC(a, t, i, o, n), await e.bringToFront(), await sleep(3e3), log("Cek form nama billing...", "INFO", n), await e.waitForSelector('iframe[src*="instrument_manager"]', {
        visible: !0,
        timeout: 15e3
    }), await sleep(1500);
    const u = await (await e.$('iframe[src*="instrument_manager"]')).contentFrame();
    if (await u.evaluate(() => !!document.querySelector('input[name="RECIPIENT"]'))) {
        const a = t.split("@")[0].replace(/[^a-zA-Z ]/g, " ").trim() || "User";
        log(`Isi nama: ${a}`, "WARN", n), await u.focus('input[name="RECIPIENT"]'), await u.type('input[name="RECIPIENT"]', a, {
            delay: 80
        }), await sleep(800), await e.keyboard.press("Enter"), log("Enter → submit", "OK", n), await sleep(2e3)
    } else log("Tidak ada form nama, tekan Enter...", "INFO", n), await e.keyboard.press("Enter"), await sleep(2e3);
    log("Proses submit Simpan...", "INFO", n), await e.waitForSelector('iframe[src*="instrument_manager"]', {
        visible: !0,
        timeout: 15e3
    }).catch(() => {}), await sleep(1e3);
    if (await e.$(".modal-dialog.b3-modal-dialog").catch(() => null)) {
        log("Modal masih ada, klik Simpan via koordinat...", "WARN", n);
        const a = await e.$('iframe[src*="instrument_manager"]');
        if (a) {
            const t = await a.contentFrame();
            await t.evaluate(() => {
                const a = document.querySelector(".submit-button.b3-primary-button");
                a && a.scrollIntoView({
                    block: "center",
                    behavior: "instant"
                })
            }), await sleep(500);
            const i = await a.boundingBox(),
                o = await t.evaluate(() => {
                    const a = document.querySelector(".submit-button.b3-primary-button");
                    if (!a) return null;
                    const e = a.getBoundingClientRect();
                    return {
                        x: e.left + e.width / 2,
                        y: e.top + e.height / 2
                    }
                });
            if (o && i) {
                const a = i.x + o.x,
                    t = i.y + o.y;
                log(`Klik koordinat: (${Math.round(a)}, ${Math.round(t)})`, "INFO", n), await e.mouse.move(a, t, {
                    steps: 10
                }), await sleep(300), await e.mouse.down(), await sleep(80), await e.mouse.up()
            }
        }
    } else log("Modal sudah tertutup — Enter berhasil!", "OK", n);
    log("Tunggu modal tertutup...", "WAIT", n);
    if (!await e.waitForFunction(() => !document.querySelector(".modal-dialog.b3-modal-dialog"), {
            timeout: 25e3
        }).then(() => !0).catch(() => !1)) throw new Error("Modal tidak tertutup setelah Simpan!");
    log("Modal tertutup!", "OK", n), await sleep(3e3), log("Reload untuk verifikasi...", "INFO", n), await e.goto("https://play.google.com/store/paymentmethods", {
        waitUntil: "networkidle2"
    }), await sleep(2e3);
    const c = await e.$$eval(".IFOh3c", a => a.map(a => a.innerText)).catch(() => []);
    if (log(`Item: ${JSON.stringify(c)}`, "INFO", n), !c.some(a => /paysafecard\s*:\s*[•*]+/i.test(a))) throw new Error(`PaysafeCard belum tersimpan! Item: ${JSON.stringify(c)}`);
    log("PaysafeCard berhasil tersimpan dan terverifikasi!", "OK", n)
}
async function prosesAkunFresh(a, e, t, i, o = "") {
    const n = await launchBrowser();
    try {
        const r = await n.newPage();
        return await patchBrowser(r), await loginGoogle(r, a, e, o), await tambahPaysafecard(n, r, t, i, !1, o), "ok"
    } catch (a) {
        return "ALREADY" === a.message ? "already" : (log(`Gagal: ${a.message}`, "ERR", o), "gagal")
    } finally {
        await sleep(2e3), await n.close()
    }
}
async function modeBurst(a, e, t) {
    log("Memulai Mode Burst...", "INFO");
    const i = await launchBrowser(),
        o = await i.newPage();
    await patchBrowser(o);
    let n = 0,
        r = 0,
        l = 0;
    const s = [],
        u = async (a, u, c) => {
            const [w, g] = a.split("|").map(a => a.trim());
            log(`\n${"─".repeat(50)}`), log(`${c} Proses: ${w}`);
            try {
                return u ? (await logoutGoogle(o), await loginGoogleBurst(o, w, g)) : await loginGoogle(o, w, g), await tambahPaysafecard(i, o, e, t, u), simpanHasil(`${w}|${g}`, SUCCESS_FILE), hapusDariAkun(a), log(`✅ ${w} → success.txt`, "OK"), n++, "ok"
            } catch (e) {
                return "ALREADY" === e.message ? (log(`${w} sudah ada PSC → already.txt`, "WARN"), simpanHasil(`${w}|${g}`, ALREADY_FILE), hapusDariAkun(a), l++, "already") : (log(`Gagal: ${e.message}`, "ERR"), s.push(a), r++, "gagal")
            }
        };
    for (let e = 0; e < a.length; e++) await u(a[e], e > 0, `[${e+1}/${a.length}]`), await sleep(3e3);
    if (s.length > 0) {
        log(`\n${"═".repeat(50)}`, "INFO"), log(`Retry ${s.length} akun yang gagal...`, "WARN");
        for (let a = 0; a < s.length; a++) {
            "ok" === await u(s[a], !0, `[RETRY ${a+1}/${s.length}]`) && (n++, r--), await sleep(3e3)
        }
    }
    return await i.close(), {
        sukses: n,
        gagal: r,
        already: l
    }
}(async () => {
    console.log("\n╔══════════════════════════════════════════════╗\n║   Bot Google Play → PaysafeCard              ║\n║   Standard Edition                           ║\n╠══════════════════════════════════════════════╣\n║  akun.txt        → googleEmail|googlePass    ║\n║  paysafecard.txt → pscEmail|pscPass          ║\n╚══════════════════════════════════════════════╝\n");
    const a = bacaFile(AKUN_FILE);
    0 === a.length && (log("akun.txt kosong! Format: googleEmail|googlePass", "ERR"), process.exit(1));
    const e = bacaFile(PSC_FILE);
    0 === e.length && (log("paysafecard.txt kosong! Format: pscEmail|pscPass", "ERR"), process.exit(1));
    const t = 1 === e.length,
        [i, o] = e[0].split("|").map(a => a.trim());
    log(`Akun Google  : ${a.length}`), log(`Akun PSC     : ${e.length}${t?" (dipakai semua akun)":""}`), console.log("\n┌──────────────────────────────────────────────────────────┐\n│  Menu Bot                                                │\n│  1. Mode Fresh Browser (1 Browser per Akun)              │\n│     → Support Multi Thread                               │\n│  2. Mode Burst (1 Browser, Logout > Login berikutnya)    │\n│     → Lebih cepat, PSC session tersimpan                 │\n└──────────────────────────────────────────────────────────┘");
    const n = await tanya("\nPilih menu (1/2): ");
    if ("1" === n) {
        const n = await tanya("Jumlah thread (browser bersamaan): "),
            r = Math.max(1, parseInt(n) || 1);
        console.log(`\n${"─".repeat(50)}`), log(`Mode Fresh | ${a.length} akun | ${r} thread`, "INFO"), console.log(`${"─".repeat(50)}\n`);
        let l = 0,
            s = 0,
            u = 0;
        const c = {
                locked: !1
            },
            w = async () => {
                for (; c.locked;) await sleep(50);
                c.locked = !0;
                const e = u++;
                return c.locked = !1, e < a.length ? {
                    baris: a[e],
                    idx: e
                } : null
            };
        let g = 0;
        const d = [],
            m = async (a, e, t, i) => {
                for (; c.locked;) await sleep(50);
                c.locked = !0, "ok" === a ? (l++, simpanHasil(`${e}|${t}`, SUCCESS_FILE), hapusDariAkun(i)) : "already" === a ? (g++, simpanHasil(`${e}|${t}`, ALREADY_FILE), hapusDariAkun(i)) : (s++, d.push(i)), c.locked = !1
            }, p = async a => {
                const n = `T${a}`;
                for (;;) {
                    const a = await w();
                    if (!a) break;
                    const {
                        baris: r
                    } = a, [l, s] = r.split("|").map(a => a.trim());
                    let u, c;
                    if (t) u = i, c = o;
                    else {
                        const t = a.idx % e.length;
                        [u, c] = e[t].split("|").map(a => a.trim())
                    }
                    const g = await prosesAkunFresh(l, s, u, c, n);
                    await m(g, l, s, r), "ok" === g ? log(`✅ ${l} → success.txt`, "OK", n) : "already" === g && log(`⏭ ${l} → already.txt`, "WARN", n), await sleep(2e3)
                }
            };
        if (await Promise.all(Array.from({
                length: r
            }, (a, e) => p(e + 1))), d.length > 0) {
            console.log(`\n${"═".repeat(50)}`), log(`Retry ${d.length} akun yang gagal...`, "WARN"), u = 0;
            const a = [...d],
                n = async () => {
                    for (; c.locked;) await sleep(50);
                    c.locked = !0;
                    const e = u++;
                    return c.locked = !1, e < a.length ? {
                        baris: a[e],
                        idx: e
                    } : null
                }, w = async a => {
                    const r = `RT${a}`;
                    for (;;) {
                        const a = await n();
                        if (!a) break;
                        const {
                            baris: u
                        } = a, [w, d] = u.split("|").map(a => a.trim());
                        let m, p;
                        if (t) m = i, p = o;
                        else {
                            const t = a.idx % e.length;
                            [m, p] = e[t].split("|").map(a => a.trim())
                        }
                        const h = await prosesAkunFresh(w, d, m, p, r);
                        for (; c.locked;) await sleep(50);
                        c.locked = !0, "ok" === h ? (l++, s--, simpanHasil(`${w}|${d}`, SUCCESS_FILE), hapusDariAkun(u), log(`✅ ${w} → success.txt`, "OK", r)) : "already" === h && (g++, s--, simpanHasil(`${w}|${d}`, ALREADY_FILE), hapusDariAkun(u)), c.locked = !1, await sleep(2e3)
                    }
                };
            await Promise.all(Array.from({
                length: r
            }, (a, e) => w(e + 1)))
        }
        console.log(`\n${"═".repeat(50)}`), log(`Selesai! Sukses: ${l} | Already: ${g} | Gagal: ${s}`, "OK")
    } else if ("2" === n) {
        console.log(`\n${"─".repeat(50)}`), log(`Mode Burst | ${a.length} akun | 1 browser`, "INFO"), console.log(`${"─".repeat(50)}\n`);
        const {
            sukses: e,
            gagal: t,
            already: n
        } = await modeBurst(a, i, o);
        console.log(`\n${"═".repeat(50)}`), log(`Selesai! Sukses: ${e} | Already: ${n} | Gagal: ${t}`, "OK")
    } else log("Menu tidak valid! Pilih 1 atau 2.", "ERR"), process.exit(1)
})();