#include <stdint.h>
#include <stddef.h>
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
    BUF *b;
    PACK *p;
    BUF *out;

    if (data == NULL || size == 0 || size > (2U * 1024U * 1024U))
        return 0;

    b = NewBuf();
    WriteBuf(b, (void *)data, (UINT)size);
    SeekBufToBegin(b);
    p = BufToPack(b);
    FreeBuf(b);

    if (p == NULL)
        return 0;

    (void)PackGetInt(p, "noop");
    (void)PackGetInt(p, "authtype");
    (void)PackGetInt(p, "protocol");
    (void)PackGetDataSize(p, "secure_password");
    (void)PackGetDataSize(p, "ticket");

    out = PackToBuf(p);
    if (out != NULL)
    {
        PACK *p2;
        SeekBufToBegin(out);
        p2 = BufToPack(out);
        if (p2 != NULL)
            FreePack(p2);
        FreeBuf(out);
    }

    FreePack(p);
    return 0;
}
