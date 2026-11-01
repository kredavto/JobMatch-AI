#!/bin/sh
# No documents are accepted until actual cgroup ceilings and required local policy pass.
set -eu
fail() { echo 'Required scanner isolation unavailable' >&2; exit 1; }
number() { case "$1" in ''|*[!0-9]*) return 1;; esac; test "${#1}" -le 10; }
read -r memory < /sys/fs/cgroup/memory.max || fail
read -r swap < /sys/fs/cgroup/memory.swap.max || fail
read -r pids < /sys/fs/cgroup/pids.max || fail
read -r quota period < /sys/fs/cgroup/cpu.max || fail
number "$memory" && test "$memory" -gt 0 && test "$memory" -le 4294967296 || fail
test "$swap" = 0 || fail
number "$pids" && test "$pids" -gt 0 && test "$pids" -le 64 || fail
number "$quota" && number "$period" && test "$quota" -gt 0 && test "$period" -gt 0 && test "$quota" -le "$period" || fail
cmp -s /etc/clamav/jobmatch-policy.cdb /var/lib/clamav/jobmatch-policy.cdb || { echo 'Required scanner policy unavailable' >&2; exit 1; }
ulimit -c 0
ulimit -n 256
# Scanner does not need inherited proxies, credentials or operator shell metadata.
exec /usr/bin/env -i PATH=/usr/local/bin:/usr/bin:/bin TZ=UTC HOME=/tmp /usr/local/bin/jobmatch-clamd -F --config-file=/etc/clamav/jobmatch.conf
