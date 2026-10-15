#include <stdint.h>
#include <stddef.h>
#include <stdio.h>
#include <Mayaqua/Mayaqua.h>
#include <Cedar/Cedar.h>

int LLVMFuzzerInitialize(int *argc, char ***argv)
{
    MayaquaMinimalMode();
    InitMayaqua(false, false, 0, NULL);
    InitCedar();
    return 0;
}

int LLVMFuzzerTestOneInput(const uint8_t *data, size_t size)
{
    SOCK *client = NULL, *server = NULL;
    PACK *p;
    BUF *wire;
    char header[512];
    int header_len;

    if (data == NULL || size == 0 || size > (1024U * 1024U))
        return 0;

    NewSocketPair(&client, &server, NULL, 12345, NULL, 443);
    if (client == NULL || server == NULL)
        goto cleanup;

    SetTimeout(server, 50);
    header_len = snprintf(header, sizeof(header),
        "POST /vpnsvc/vpn.cgi HTTP/1.1\r\n"
        "Host: localhost\r\n"
        "Content-Type: application/octet-stream\r\n"
        "Content-Length: %zu\r\n\r\n", size);
    if (header_len <= 0 || (size_t)header_len >= sizeof(header))
        goto cleanup;

    wire = NewBuf();
    WriteBuf(wire, header, (UINT)header_len);
    WriteBuf(wire, (void *)data, (UINT)size);
    SendAll(client, wire->Buf, wire->Size, false);
    FreeBuf(wire);
    Disconnect(client);

    p = HttpServerRecvEx(server, 1024U * 1024U);
    if (p != NULL)
        FreePack(p);

cleanup:
    if (client != NULL)
    {
        Disconnect(client);
        ReleaseSock(client);
    }
    if (server != NULL)
    {
        Disconnect(server);
        ReleaseSock(server);
    }
    return 0;
}
