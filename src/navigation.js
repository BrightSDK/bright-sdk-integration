const readline = require('readline');
const fs = require('fs');
const path = require('path');
const util = require('util');
const {print, exit} = require('./lib.js');

const readdir = util.promisify(fs.readdir);

const create_readline_interface = ()=>readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const clear_screen = rl=>{
    const auto_close = !rl;
    rl = rl || create_readline_interface();
    // print('-------------------------');
    // print('\n\n\n\n\n\n\n');
    readline.cursorTo(rl.output, 0, 0);
    readline.clearScreenDown(rl.output);
    if (auto_close)
        rl.close();
};

const prompt = async(question, def_answer, opt={})=>{
    const rl = create_readline_interface();
    let instructions = '';
    if (opt.selectable)
        instructions = `↑/↓ to navigate`;
    const full_question = def_answer
        ? `${question} (${def_answer}): `
        : instructions
            ? `${question} (${instructions}): `
            : `${question}: `;
    let selected, resolved;
    const select_file = (cwd, opt={})=>new Promise((resolve, reject)=>{
        let current_dir = cwd || process.cwd();
        let current_index = 0;
        let files = [];

        const select = index=>{
            if (index < 0 || index >= files.length)
                return;
            current_index = index;
            selected = null;
            if (files[index] != '..')
            {
                const fname = path.join(current_dir, files[index]);
                const is_dir = fs.lstatSync(fname).isDirectory();
                if (opt.file ^ is_dir)
                {
                    selected = fname;
                }
            }
        };

        const refresh_screen = ()=>{
            clear_screen(rl);
            if (opt.header)
                print(opt.header);
        };
        rl.input.on('keypress', async (str, key)=>{
            if (key.name === 'up')
            {
                select(Math.max(current_index-1, 0));
            }
            else if (key.name === 'down')
            {
                select(Math.min(current_index+1, files.length-1));
            }
            else if (key.name === 'right'
                && fs.lstatSync(path.join(current_dir, files[current_index]))
                    .isDirectory())
            {
                current_dir = path.join(current_dir, files[current_index]);
                select(0);
                await read_dir();
            }
            else if (key.name === 'left')
            {
                current_dir = path.dirname(current_dir);
                select(0);
                await read_dir();
            }
            else if (key.name === 'escape')
            {
                current_dir = cwd;
                select(0);
                await read_dir();
            }
            refresh_screen();
            print_files();
        });

        // handle ENTER key
        rl.on('line', ()=>{
            if (!selected)
                return;
            if (opt.validate_fn && !opt.validate_fn(selected))
                return;
            resolve(selected);
            resolved = true;
        });

        async function read_dir() {
            try {
                let f = await readdir(current_dir);
                files = f;
                if (!opt.file)
                {
                    files = files.filter(file=>
                        fs.lstatSync(path.join(current_dir, file)).isDirectory());
                }
                files.unshift('..');
                if (opt.selected)
                {
                    select(files.indexOf(opt.selected));
                    delete opt.selected;
                }
            }
            catch (err){ reject(err); }
        }

        function print_files() {
            if (resolved)
                return;
            if (opt.question)
                print(opt.question, {bold: true});
            print(`Select ${opt.file ? 'File' : 'Directory'} in ${current_dir}`,
                {bold: true});
            files.forEach((file, index) => {
                if (fs.lstatSync(path.join(current_dir, file)).isDirectory())
                    file = `[${file}]`;
                if (index === current_index)
                    print(`> ${file}`);
                else
                    print(`  ${file}`);
            });
            print('');
            print('↑/↓: navigate');
            print('←: go up');
            print('→: go in');
            print('ESC: reset to initial directory');
            if (selected)
            {
                print('');
                print('SELECTED: '+selected);
                print('ENTER: confirm selection');
            }
        }
        read_dir().then(()=>{
            refresh_screen();
            print_files();
        });
    });
    return new Promise(resolve=>{
        let selection_started = false;
        rl.input.on('keypress', (str, key)=>{
            if (!opt.selectable || key.name != 'up' && key.name != 'down')
                return;
            if (selection_started)
                return;
            selection_started = true;
            select_file(process.cwd(),
                {question, header: opt.buffer, file: false});
        });
        rl.question(full_question, answer=>{
            if (selection_started && selected)
                answer = selected;
            const res = answer||def_answer;
            if (!res)
                exit('Value required!');
            clear_screen(rl);
            if (opt.buffer)
                print(opt.buffer);
            resolve(res);
            rl.close();
        });
    });
};


module.exports = {clear_screen, prompt};

if (require.main === module)
{
    prompt
    .then(result=>print(`Result: ${result}`))
    .catch(err=>console.error(`Error: ${err}`));
}