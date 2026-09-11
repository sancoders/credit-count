import postcss from 'postcss'
import tw from '@tailwindcss/postcss'
import fs from 'fs'
const css = fs.readFileSync('.twtmp/head/globals.css','utf8')
const res = await postcss([tw({base: process.cwd()})]).process(css, {from: '.twtmp/head/globals.css'})
fs.writeFileSync('public/_twtmp/head.css', res.css)
console.log('ok', res.css.length)
