FROM clamav/clamav:1.4.6 AS upstream
USER root
RUN ln -s "$(command -v clamd)" /usr/local/bin/jobmatch-clamd \
 && ln -s "$(command -v freshclam)" /usr/local/bin/jobmatch-freshclam
COPY worker/scanner/clamd.conf /etc/clamav/jobmatch.conf
COPY worker/scanner/start.sh /etc/clamav/jobmatch-start.sh
COPY worker/scanner/freshclam.conf /etc/clamav/jobmatch-freshclam.conf
COPY --chown=clamav:clamav worker/scanner/jobmatch-policy.cdb /var/lib/clamav/jobmatch-policy.cdb
COPY worker/scanner/jobmatch-policy.cdb /etc/clamav/jobmatch-policy.cdb
# Copy the vendor rootfs without inheriting its writable anonymous database volume.
FROM scratch
COPY --from=upstream / /
ENV TZ=UTC
USER clamav
CMD ["/bin/sh", "/etc/clamav/jobmatch-start.sh"]
