import sys

if sys.version_info[0] < 3:
    sys.stderr.write("I need Python 3 :(\n")
    exit()

import urllib.parse
import os
import subprocess
import argparse
from socketserver import ThreadingMixIn
from http.server import SimpleHTTPRequestHandler, HTTPServer

nullfile = open(os.devnull, 'w')  # coz 3.2 support

try:
    subprocess.call(['ffmpeg'], stdout=nullfile, stderr=nullfile)
except:
    sys.stderr.write("Can't call ffmpeg, make sure it's installed!\n")
    exit()

parser = argparse.ArgumentParser()
parser.add_argument('dir', default='.', nargs='?',
                    help='Directory containing html files, and also output directory')
parser.add_argument(
    '-p', '--port', help='Server port', type=int, default=22633)
parser.add_argument(
    '-n', '--no-inject', help='Don\'t inject script inclusion code to html files', action='store_true', default=False)
args = parser.parse_args()

port = args.port
dir = args.dir
vcodec = ['-c:v', 'libx264', '-pix_fmt', 'yuv420p']
ext = 'mp4'

script_path = os.path.dirname(os.path.abspath(__file__))
js_cache = {'/MTC.js': None, '/MTCWorker.js': None, '/cvr.js': None}
try:
    for xk in js_cache.keys():
        with open(os.path.join(script_path, xk[1:]), 'rb') as ff:
            js_cache[xk] = ff.read()
except:
    sys.stderr.write("Can't open my JS files :(\nMake sure " + (', '.join(
        [x[1:] for x in js_cache.keys()])) + " are in the same directory as this script\n")
    exit()


html_inject = b'<script src="/MTC.js"></script><script src="/cvr.js"></script>'


def is_path_sane(path):  # coz ../../.bash_profile is not really sane
    return not path[0] == '.' and '../' not in path


def chunk_sort_key(fname):
    return int(fname[fname.rindex('.c') + 2:fname.rindex('.part')])


def remove_frames(name):
    for f in os.listdir():
        if f.startswith(name) and f.endswith('.cvf.png'):
            os.remove(f)


def write_concat_file(fp, name):
    all = [f for f in os.listdir() if f.startswith(
        name) and f.endswith('.part.' + ext)]
    all.sort(key=chunk_sort_key)

    for f in all:
        fp.write('file \'' + f.replace('\'', '\'\\\'\'') + '\'\n')


def remove_chunks(name):
    for f in os.listdir():
        if f.startswith(name) and f.endswith('.part.' + ext):
            os.remove(f)


class CVRHandler(SimpleHTTPRequestHandler):

    def parse_req(s):
        s.req = urllib.parse.parse_qs(
            s.requestline[s.requestline.index('/') + 2:-9])

        if 'name' in s.req and not is_path_sane(s.req['name'][0]):
            raise Exception('Invalid file path')

    def prepare_response(s, type='text/plain', code=200):
        s.send_response(code)
        s.send_header('Access-Control-Allow-Origin', '*')
        s.send_header('Access-Control-Allow-Headers', 'content-type')
        if type:
            s.send_header('Content-type', type)
        s.end_headers()

    def do_OPTIONS(s):
        s.prepare_response(type='')

    def do_POST(s):
        s.parse_req()

        with open(s.req['name'][0] + 'f' + s.req['seq'][0] + '.cvf.png', 'wb') as f:
            f.write(s.rfile.read(int(s.headers.get('Content-Length'))))

        s.prepare_response()
        s.wfile.write(b'ok')

    def do_GET(s):
        if len(s.path) == 1 or not s.path[1] == '?':
            pfile = s.translate_path(s.path)

            if os.path.isdir(pfile):
                for index in 'index.html', 'index.htm':
                    index = os.path.join(pfile, index)
                    if os.path.exists(index):
                        pfile = index
                        break

            # fine coz this is not a security check
            if not args.no_inject and (pfile.endswith('.html') or pfile.endswith('.htm')):
                s.prepare_response(type='text/html')
                s.wfile.write(html_inject)

                try:
                    with open(pfile, 'rb') as html:
                        s.wfile.write(html.read())
                except:
                    pass  # my favorite line
                return

            elif s.path in js_cache:
                s.prepare_response(type='application/javascript')
                s.wfile.write(js_cache[s.path])
                return

            return super().do_GET()

        s.parse_req()

        if 'finish' in s.req:
            subprocess.call(['ffmpeg', '-y',  '-framerate', s.req['fps'][0], '-i', s.req['name'][0] + 'f%d.cvf.png'] +
                            vcodec + [s.req['name'][0] + '.' + ('c' + s.req['chunk'][0] + '.part.' if 'chunk' in s.req else '') + ext])
            remove_frames(s.req['name'][0])

        elif 'join' in s.req:
            with open(s.req['name'][0] + '.concat', 'w') as f:
                write_concat_file(f, s.req['name'][0])

            subprocess.call(['ffmpeg', '-y', '-f', 'concat', '-i', s.req['name']
                             [0] + '.concat', '-c', 'copy', s.req['name'][0] + '.' + ext])
            remove_chunks(s.req['name'][0])
            os.remove(s.req['name'][0] + '.concat')

        s.prepare_response()
        s.wfile.write(b'ok')


class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    pass

os.chdir(dir)
httpd = ThreadedHTTPServer(('localhost', port), CVRHandler)
print('serving @ http://localhost:' + str(port))
httpd.serve_forever()
httpd.server_close()
