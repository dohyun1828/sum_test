#include <stdint.h>
#include <stddef.h>
#include <Mayaqua/Mayaqua.h>

int LLVMFuzzerInitialize(int *argc, char ***argv)
{
    MayaquaMinimalMode();
    InitMayaqua(false, false, 0, NULL);
    return 0;
}

int LLVMFuzzerTestOneInput(const uint8_t *data, size_t size)
{
    SOCK *client = NULL, *server = NULL;
    HTTP_HEADER *h;

    if (data == NULL || size == 0 || size > (256U * 1024U))
        return 0;

    NewSocketPair(&client, &server, NULL, 12345, NULL, 443);
    if (client == NULL || server == NULL)
        goto cleanup;

    SetTimeout(server, 50);
    SendAll(client, (void *)data, (UINT)size, false);
    Disconnect(client);

    h = RecvHttpHeader(server);
    if (h != NULL)
    {
        char *s = HttpHeaderToStr(h);
        (void)GetContentLength(h);
        (void)GetHttpValue(h, "Host");
        (void)GetHttpValue(h, "Content-Length");
        if (s != NULL)
            Free(s);
        FreeHttpHeader(h);
    }

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
