#!/usr/bin/python

import ldap
import os.path
import os
import subprocess
import imp
import json
import getpass
import urllib

# WARNING: If you use a non-ldaps: URL, you should add a call
# to conn.start_tls_s().
SERVER = "ldaps://addressbook.mozilla.com/"
# BASE_DN = "dc=mozilla" # All people
BASE_DN = "o=com,dc=mozilla" # Mozilla Corporation people (and 1/2 messaging)
# BASE_DN = "o=org,dc=mozilla" # Mozilla Foundation people
# BASE_DN = "o=net,dc=mozilla" # Community people (and 1/2 messaging)

BOSS = "mail=jnightingale@mozilla.com,o=com,dc=mozilla"
LDAP_ATTRS = ["cn", "email", "bugzillaEmail"]
basedir = os.path.dirname(os.path.realpath(__file__))

RESOLVED_URL = "https://bugzilla.mozilla.org/bzapi/count?resolution=FIXED&emailtype1=exact&chfieldto=Now&chfield=resolution&emailassigned_to1=1&query_format=advanced&chfieldfrom=2014-04-01&chfieldvalue=FIXED&email1="
MENTORED_URL = "https://bugzilla.mozilla.org/bzapi/count?&resolution=FIXED&emailtype1=exact&chfieldto=Now&chfield=resolution&query_format=advanced&chfieldfrom=2014-04-01&chfieldvalue=FIXED&emailbug_mentor1=1&email1="

MENTORING_OFFERED = "https://bugzilla.mozilla.org/bzapi/count?resolution=---&emailtype1=exact&emailbug_mentor1=1&email1="
GOOD_FIRST_BUG_OFFERED = "https://bugzilla.mozilla.org/bzapi/count?f1=status_whiteboard&o1=allwordssubstr&resolution=---&o2=equals&query_format=advanced&bug_status=UNCONFIRMED&bug_status=NEW&bug_status=REOPENED&v1=good%20first&emailtype1=exact&emailbug_mentor1=1&email1="

print("Connecting to " + SERVER+ " - Log in:")

def openConnection():
    conn = ldap.initialize(SERVER)
    user = raw_input("Username (@mozilla.com): ")
    pw = getpass.getpass(prompt="Password: ")
    dn = "mail=" + user + "@mozilla.com,o=com,dc=mozilla"
    try:
        conn.simple_bind_s(dn, pw)
    except ldap.INVALID_CREDENTIALS:
        print "Username/Password incorrect."
	exit(-1)
    print("Please be patient, this can take some time.\n")
    return conn

def getChildren(conn, identifier):
	f = "(manager=" + identifier +")"
	children = conn.search_s(base=BASE_DN, scope=ldap.SCOPE_SUBTREE, filterstr=f, attrlist=LDAP_ATTRS)
	l= list()
	for dn, info in children:
		d = dict()	
		# d['id'] = dn
		d['name'] = ''.join(info['cn'])
		if 'bugzillaEmail' in info: 
			d['bugmail'] =  ''.join(info['bugzillaEmail'])
		if 'email' in info:
			d['email'] = ''.join(info['email'])
		d['mentored'] = 0 
		d['resolved'] = 0
		d['mentor_offer'] = 0
		d['good_first'] = 0
		if 'bugmail' in d:  # rewrite this stuff as iterators, this is seriously some onsense
			d['mentored'] += getNumbers(MENTORED_URL, urllib.quote(str(d['bugmail'])))
			d['resolved'] += getNumbers(RESOLVED_URL, urllib.quote(str(d['bugmail'])))
			d['mentor_offer'] += getNumbers(MENTORING_OFFERED, urllib.quote(str(d['bugmail'])))
			d['good_first'] += getNumbers(GOOD_FIRST_BUG_OFFERED, urllib.quote(str(d['bugmail'])))		 
		if 'email' in d:    # this also, nonsense also
			d['mentored'] += getNumbers(MENTORED_URL, urllib.quote(str(d['email'])))
			d['resolved'] += getNumbers(RESOLVED_URL, urllib.quote(str(d['email'])))
			d['mentor_offer'] += getNumbers(MENTORING_OFFERED, urllib.quote(str(d['bugmail'])))
			d['good_first'] += getNumbers(GOOD_FIRST_BUG_OFFERED, urllib.quote(str(d['bugmail'])))
		d['children'] = getChildren(conn, dn)
		l.append(d)	
	return l
		
def getNumbers(url, bugmail):
	jsonurl = urllib.urlopen(url+bugmail)
	text = json.loads(jsonurl.read())
	#print(":- " + bugmail + " - " + str( text['data']))  
	return text['data']

def aggregateNumbers(d):
    for f in d:
	aggregateNumbers(f['children']) 
	for c in f['children']:
 		print (c['name'])
 		f['mentored'] += c['mentored']
		f['resolved'] += c['resolved']
		f['good_first'] += c['good_first']
		f['mentor_offer'] += c['mentor_offer'] 	
	
	


def cleanup(conn):
    conn.unbind_s()

conn = openConnection()
output = getChildren(conn,BOSS)
#print (output)
aggregateNumbers(output)
print "[{ \"name\": \"Johnathan Nightingale\", \"bugmail\": \"jonath@mozilla.com\", \"children\": "
print json.dumps(output, sort_keys=True, indent=4, separators=(',', ': '))
print "}]"
cleanup(conn)




