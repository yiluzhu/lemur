import os
import logging
from lemur.constants import ROOT_DIR

handler = logging.FileHandler(os.path.join(ROOT_DIR, 'extra_log.log'))
formatter = logging.Formatter('%(asctime)s - %(process)d - %(thread)d - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
extra_logger = logging.getLogger('extra_log')
extra_logger.setLevel(logging.INFO)
extra_logger.addHandler(handler)
