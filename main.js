const http = require('http');
const fs = require('fs');
const url = require('url');
const qs = require('querystring');
const path = require('path');

function sanitizeFilename(name) {
  return path.basename(name);
}

function templateHTML(title, list, body, controls) {
  return `
  <!doctype html>
  <html>
    <head>
      <title>WEB2 - ${title}</title>
      <meta charset="utf-8">
    </head>
    <body>
      <h1><a href="/">WEB</a></h1>
      ${list}
      ${controls}
      ${body}
    </body>
  </html>`;
}

function templateList(filelist) {
  let list = '<ul>';
  for (const f of filelist) {
    const filename = sanitizeFilename(f);
    list += `<li><a href="/?id=${encodeURIComponent(filename)}">${filename}</a></li>`;
  }
  list += '</ul>';
  return list;
}

const app = http.createServer((req, res) => {
  const _url = req.url;
  const parsedUrl = url.parse(_url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;

  if (pathname === '/') {
    fs.readdir('./data', (err, files) => {
      const list = templateList(files);
      if (!query.id) {
        const html = templateHTML('Welcome', list,
          `<h2>Welcome</h2>Hello, Node.js`,
          `<a href="/create">create</a>`);
        res.writeHead(200); res.end(html);
      } else {
        const id = sanitizeFilename(query.id);
        fs.readFile(`data/${id}`, 'utf8', (err2, description) => {
          const html = templateHTML(id, list,
            `<h2>${id}</h2>${description}`,
            `<a href="/create">create</a> |
             <a href="/update?id=${encodeURIComponent(id)}">update</a> |
             <form action="/delete_process" method="post" style="display:inline">
               <input type="hidden" name="id" value="${id}">
               <input type="submit" value="delete">
             </form>`);
          res.writeHead(200); res.end(html);
        });
      }
    });

  } else if (pathname === '/create') {
    fs.readdir('./data', (err, files) => {
      const list = templateList(files);
      const html = templateHTML('Create', list, `
        <form action="/create_process" method="post">
          <p><input type="text" name="title" placeholder="title"></p>
          <p><textarea name="description" placeholder="description"></textarea></p>
          <p><input type="submit" value="create"></p>
        </form>`, `<a href="/create">create</a>`);
      res.writeHead(200); res.end(html);
    });

  } else if (pathname === '/create_process') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      const post = qs.parse(body);
      const title = sanitizeFilename(post.title);
      const desc = post.description;
      fs.writeFile(`data/${title}`, desc, err => {
        res.writeHead(302, { Location: `/?id=${encodeURIComponent(title)}` });
        res.end();
      });
    });

  } else if (pathname === '/update') {
    fs.readdir('./data', (err, files) => {
      const id = sanitizeFilename(query.id);
      fs.readFile(`data/${id}`, 'utf8', (err2, desc) => {
        const list = templateList(files);
        const html = templateHTML(`Update - ${id}`, list, `
          <form action="/update_process" method="post">
            <input type="hidden" name="id" value="${id}">
            <p><input type="text" name="title" value="${id}"></p>
            <p><textarea name="description">${desc}</textarea></p>
            <p><input type="submit" value="update"></p>
          </form>`, `<a href="/create">create</a> | <a href="/update?id=${encodeURIComponent(id)}">update</a>`);
        res.writeHead(200); res.end(html);
      });
    });

  } else if (pathname === '/update_process') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      const post = qs.parse(body);
      const oldId = sanitizeFilename(post.id);
      const newTitle = sanitizeFilename(post.title);
      const desc = post.description;
      fs.rename(`data/${oldId}`, `data/${newTitle}`, err => {
        fs.writeFile(`data/${newTitle}`, desc, err2 => {
          res.writeHead(302, { Location: `/?id=${encodeURIComponent(newTitle)}` });
          res.end();
        });
      });
    });

  } else if (pathname === '/delete_process') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      const post = qs.parse(body);
      const id = sanitizeFilename(post.id);
      fs.unlink(`data/${id}`, err => {
        res.writeHead(302, { Location: '/' });
        res.end();
      });
    });

  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

app.listen(3000, () => console.log('Server running on 3000'));
