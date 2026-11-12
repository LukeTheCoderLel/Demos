// Turns the `vite build --mode artifact` output into one self-contained page
// body (title, styles, markup, script) for hosting as a Claude artifact.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'

const dir = 'dist-web'
const html = readFileSync(`${dir}/index.html`, 'utf8')
const assets = readdirSync(`${dir}/assets`)
const css = assets.filter((f) => f.endsWith('.css')).map((f) => readFileSync(`${dir}/assets/${f}`, 'utf8')).join('\n')
const js = assets.filter((f) => f.endsWith('.js')).map((f) => readFileSync(`${dir}/assets/${f}`, 'utf8'))
if (js.length !== 1) throw new Error(`expected one JS bundle, found ${js.length}`)

const title = html.match(/<title>[\s\S]*?<\/title>/)[0]
const safeJs = js[0].replace(/<\/script/gi, '<\\/script')
const safeCss = css.replace(/<\/style/gi, '<\\/style')
const page = `${title}
<meta name="theme-color" content="#050505">
<style>${safeCss}</style>
<div id="root"></div>
<script type="module">${safeJs}</script>
`
writeFileSync(`${dir}/demo-vault.html`, page)
console.log(`wrote ${dir}/demo-vault.html (${(page.length / 1024).toFixed(0)} KB)`)
