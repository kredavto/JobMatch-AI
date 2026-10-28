FROM clamav/clamav:1.4.6 AS upstream
USER root
RUN ln -s "$(command -v clamd)" /usr/local/bin/jobmatch-clamd
COPY worker/scanner/clamd.conf /etc/clamav/jobmatch.conf
# Copy the vendor rootfs without inheriting its writable anonymous database volume.
FROM scratch
COPY --from=upstream / /
ENV TZ=UTC
USER clamav
CMD ["/usr/local/bin/jobmatch-clamd", "-F", "--config-file=/etc/clamav/jobmatch.conf"]
