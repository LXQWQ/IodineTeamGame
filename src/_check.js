import { DEEPSEEK_PROMPT, DEFAULT_PROMPT } from './prompt.js';

function check(name, s) {
  let count = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '`' && (i === 0 || s[i-1] !== '\')) count++;
  }
  console.log(name + ': ' + count + ' unescaped backticks');
  if (count > 0) {
    s.split('\n').forEach((line, i) => {
      if (line.includes('`')) console.log('  line ' + (i+1) + ': ' + line.substring(0, 120));
    });
  }
}

check('DS', DEEPSEEK_PROMPT);
check('DF', DEFAULT_PROMPT);
