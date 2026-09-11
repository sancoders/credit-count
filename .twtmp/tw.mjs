import postcss from 'postcss'
import tw from '@tailwindcss/postcss'
import fs from 'fs'
const css = fs.readFileSync('app/globals.css','utf8')
const res = await postcss([tw({base: process.cwd()})]).process(css, {from: 'app/globals.css'})
fs.writeFileSync('.twtmp/out.css', res.css)
console.log('len', res.css.length)
