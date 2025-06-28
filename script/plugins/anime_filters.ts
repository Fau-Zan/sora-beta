import { v4 } from 'uuid';

export const buildHeaders = () => ({
      'x-request-id': v4(),
      'x-first-installation-id': '01HAHP96A946B8TD8QSDSN6DXA',
      'x-app-id': 'com.lightricks.photoleap',
      'x-build-number': '129000030',
      'x-platform': 'android',
      'x-lightricks-subscriber': 'false',
      'x-client-user-id': 'ad2a5a24-926c-4f65-be4a-bd0933a35296',
      'x-lightricks-api-key': 'l0uKanZ8DC29DAFWqWetggb1N6RCK5NqGxR8Jkf8ARB7cztwlvRlgX7wNzrGuFzp',
});

export const baseUrl = 'https://cf.res.lightricks.com/v2/api/ai-anime/predict-sync';

export const preset = {
      fire: {
            preset: 'anime101',
            intensity: 1,
            seed: 1609655584,
            encrypted_preset:
                  'gAAAAABk-tziKsTg_TWNgoi3-HsaKd7rTGPW5HrzEqGN7YAADnclxdDfZLt5uDtJs7yj4zazOxM4faridz_LiPINbZWFYdz-iMSUT9MqH3tSxa9ze4NYr8VtcntibiIiSZRL8wi017FCJr-K47P0Ye2Da55jR_w209aoK6A5xp5Joo8prD8o7UYZJ1iw5LMc31fqzZjU2Sm4vF06fZgcUdGvPZ0ZXp6DZUrGzb9O9bCDzZNhh-cUmYCbvWEKf43St3LEqaEcljEGZvuV5rD8jdOEXLt5lxRO6tLCn3B3wrv3TkRcr4etfCsvby8JYClnE_HPwcDo5lAfTD-3yC8CbpJsVbK7-y2hKNFp2scmssINmy9meNFhkEifxMNuSij-tCLnvTK0J8yfHWzvNR6Du0ucbbSKx2y9ckc1v349ytMSTW_sbziVmsu9KY0TcRW8SagzI_oLnNMxz9OuDYp5MrmJzGFH3-tYQw==',
      },
      demon: {
            preset: 'anime102',
            intensity: 1,
            seed: 514751447,
            encrypted_preset:
                  'gAAAAABk-tziE37WIcr16U0XXE1Dxqk4lPYHuP38gwKMRnYSxfy4Q8Voj6wh2CIQx-MaA6xiBIZWIc5JGqJNckFoI9qgRbrOKsIcZ64bzTzMO9WETBA-ZD1ONk5kVX8WodMmMvwN-gBa-KxJ2f4_Kbd1RH5HQWeb2kURMYFe1XbGgOGTIrKeh9sACpc9v26HGY01Po3uu833mAffFV-_LOqp9gxy7XL1KMWRadz-iyN31GcCLrq-8Li23HpOYWPDELKeKPsE6B5RtdS0dev1ujefcjrAuoAHtVkKUzhdEaOsUzq8yeKqlr6iF2fmInYR5UsfB_ij5-iv1cjhSnTp4i8UUicesinKC7UToiPhpEl8j1xd43wFm0x0QfZ73pIA31ZY1TSa1AnLySOxwPVOqFn1pdfkFUk2aYEGsk3RE8YAdhM0Fo-0p7nlQvVGnzQOwfJx_VoFGKdHayi7ba7xWnmPbSGvZxre98plvWhB4XA7cNukAp0qCY2-aVcmd6pGXekA9xWwNgEp',
      },
      studio: {
            preset: 'anime131',
            intensity: 1,
            seed: 490859007,
            encrypted_preset:
                  'gAAAAABk-tziwmMvhEnaRlxPGRtRLdgmDXrsHAqaWMVYKCwtJ7Q8iQ1-GA4OOz9pmQuq9XzfstahO6bfB9ngt32J_TbinhaHjSCL6aUqeLP9HVFshHR1LosdmTgcZJcy_OI9r4Y05UeevGLfPTaR22gIICfqK2SVJ5aCGNNbB8sX1rBfPAEFy5aeNLMsvCBwDLx4EZm5dGPibixH8KTlYnknMBn2Ij13ipz4nFyeztrB0t1td5g57qO0iAXKy3hJw2VMfc3b7QdJ-ZLINp6gRjKKplspeUnfrMC42btpzzBOq-EbDTNnz8aFSCftt_magyKHEy6g6i0_RoyPXrQLeKxbBrA9bNoang17HS1q2wRl_O9Y_NFE0TV7l5RJQvaUYVocEHiZCsu5PO9K4ajNokszKy0KH4H97U1rHC8uEnw7AXZhg045mEe8UvSku-wR9Y0r9lrOwj1z',
      },
      school: {
            preset: 'anime103',
            intensity: 1,
            seed: 513074656,
            encrypted_preset:
                  'gAAAAABk-tziGLhuOl0m4fQ90ATC39zzgHJxG73cQ_tYr5tdV24HwTEOHxZbANOVINtg0n-PvBN16XoFGEqKaiW_zG_K09WOQkMfdIWdDi4SuAt6LDcazQ6rpz29p5meslQKfg6kp_6k5lpzmEsgPxFeq8NbKG_hohTECFDcXEt262G6DAacCPIeetGppHahfmsrJ-6-NFXeWtR7I0C9qhZtEyi15JF_nkZD4Wu8Z3ouwx5SxsifH2JVqjPpdUDddhys_W_FtDs_dfgk10o4uf4MlPYNHiziQ1AHitpYPxTQg4duuuZaPjFSKFQAEhZ9kPIDpa1MOQMvVvgM4bb_AGGhGtNAbpRhmg5gqe2afWtQBqu9wvSkUKoyJGB4rtzXG7sCfaVQwppfNX9S8DXPbgDALbnH5y21nsd6kTF9WmBwWPgG5Zb-iJGTK4LF6IpP1MEe75wq44CPY1F3qljUIEnYfhuFo9_HjtBVnFAZwkPkjA8gljYGt9iNAfbvkw09kee1eua9RmCS',
      },
      tradition: {
            preset: 'anime104',
            intensity: 1,
            seed: 23838452,
            encrypted_preset:
                  'gAAAAABk-tzi8uc7r42OSbXEVgrg_I1t5rVRaWPRt9WJKIOAaoi9uuhxok3sOkgCqStZDPuNscaLFgCGjkPk68Qh92DPgwsepF8Bq0x0PuW8dFY3saA3QOJsZEm8E5PxoXINrO05COcJ__qdoNx9k1fPvKDv75rVRfofUvHWmJaeKvuFOkpiAxQ71IaejtAvDvH5jfkueGc9Eywon627K_t1GaVifcTwwPf6E_O7e46fV8VBEi0VqkwGxagFTC2Lkl6Hlm4Mr07YIzk4G1bfYR4VBgy3fNclIaGetG13VZ1uYlpVzHRl_xjVE4BrJEHJMlFb6AvRDnEYwMRTHjfmfV6uPMoFUGgAT3HZHT5mYeXKEtjkZlsB7OKmAlTD0bQcYlVyJvImp_PVs1nOAM6HPI-bB5Mgzp4sSP_eXionbiqPhKH8LHSdxIV7B3TUXHb3S4zy1qcxidW5XkBE33OhV_4dEdJVwRZVooEQW3eyiCOY_7Tnaxk5NwxN0lel8iP5Vzvb2_o-IXb_',
      },
      horror: {
            preset: 'anime107',
            intensity: 1,
            seed: 1099866958,
            encrypted_preset:
                  'gAAAAABk-tziqq-xVciLgenqOtzKUNBBKCNVItBp3-niRXAzetqKoGcNQsSO_hynsV6OfToIH6vFcOX9HfxMrcFByYUsgDul8DuRsbIXbYrTKsx9Rt_TjhGk6i0ukgF1INc2jEUSoptqSoiXHlVtZuNDFnRovvcTHGe5NHwrewpcBrUIA17egNj0n9GSWtwiWWLO98gBLNTHbIpNXDtU1JnZ9lhy5yqMPLX8TtlKZkHJx7WQEr-ZGseEnvLHFhH62kDdh5sOFkBFirYh5llmTjfnJZXZ_v3k9t8COQJ4tcWOOWi2D_bNVoLtpD6wdXty3VP1nKiYHWSkd8MjSnHoPh93Ku5nQhiWRPx3P-DkAf4XYMhAeRVJOzgXxRLAYkkZCjlA0YeBq36-E6uimue-B3LpgCzKpmXqKAo29jmeQJjkoC9Exh4vwmbjZIH3TkmhqxHNWJ7IkA5luKX4R1DfWY0ZPljcXfseQdnYVAdqP_NrDJv2KE04qJ5TMUe1CRDXsrNVdRKtr7Vp',
      },
      flame: {
            preset: 'anime108',
            intensity: 1,
            seed: 1612790795,
            encrypted_preset:
                  'gAAAAABk-tzi3I1-zVXqA89T3YlXEycSLRcfFgpMAg2F1zNI6eh46R-3pf02W9hWuQuUnbAJW-21fa86qlAINc8Sn4ErLxPXgLJrBWiy7kfOwNw0Vkg5KvDKuSmE_RftmIf-K4LDrRjGnFe6YY05iKUOVv6TYN8oXJyqTlmp84VHVoTNETSrdCew6N5j_iXP1rkAd-8mXl3Z8MkG0ih6UDDtCicSYCj_Q72OGGJSK8lkNP4-5uNLeoG-1eYEg1MVybNZwOoE6copVDjcTjD91_5_w1sqWvtmOa250wTpFiIvOZ_QrZsoRW5rBjcgaz_0J9oXXnX6c68zcXK8NuwKjMxdR6xpxOqE9OKVriUZoAqRzzu0VL-m0T5_endEjdqXhxvk42-ekq4vVMwuTUn91ZJ8x4ULiRxxz48i5Jozq_F9F6fHtJ89xs93N0I1ey44hAP50NQS1eyK',
      },
};
